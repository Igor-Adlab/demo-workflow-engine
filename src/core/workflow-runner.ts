import { randomUUID } from "node:crypto";
import type { Result } from "../types/result.ts";
import type { IWorkflowSchema } from "../types/schema.ts";
import type {
  IWorkflowRunner,
  WorkflowRunnerCronSchedule,
} from "../types/workflow-runner.ts";
import { WorkflowExecutionContext } from "./execution-context.ts";
import { Workflow } from "./workflow.ts";

export class RunnerExecutionContext extends WorkflowExecutionContext {}

export class WorkflowRunner implements IWorkflowRunner {
  constructor(
    protected schema: IWorkflowSchema,
  ) {}

  async listen() {
    const promises: Promise<void>[] = [];
    const triggers = Object.values(this.schema.triggers ?? {});
    for (const trigger of triggers) {
      const promise = (async () =>
        await trigger.start(this.getTriggerHandler(trigger.id)))();

      promises.push(promise);
    }

    await Promise.all(promises);

    return;
  }

  protected getCronSchedule() {
    return Object.values(this.schema.triggers || {})
      .filter((trigger) => !!trigger.cron)
      .reduce<WorkflowRunnerCronSchedule[]>(
        (acc, trigger) =>
          acc.concat(
            Object.entries(trigger.cron!).map(([key, options]) => ({
              name: `${trigger.id}-${key}`,
              schedule: options.schedule,
              handler: () => this.handleTrigger(trigger.id, []),
            })),
          ),
        [],
      );
  }

  protected getTriggerHandler(triggerId: string) {
    return (data: Result) => this.handleTrigger(triggerId, data);
  }

  protected handleTrigger(
    triggerId: string,
    data: Result,
    ctx: WorkflowExecutionContext = new RunnerExecutionContext(),
  ) {
    const triggered = this.getTriggeredNodes(triggerId);
    return new Workflow(`workflow-runner-${randomUUID()}`, this.schema).run(
      triggered,
      data,
      ctx,
    );
  }

  private getTriggeredNodes(nodeId: string): string[] {
    const nextNodes: string[] = [];
    const { connections } = this.schema;
    if (connections[nodeId]) {
      connections[nodeId].main.forEach((connections) => {
        connections.forEach((connection) => {
          nextNodes.push(connection.node);
        });
      });
    }

    return nextNodes;
  }

  startCron() {
    const schedules = this.getCronSchedule();
    for (const { handler, name, schedule } of schedules) {
      Deno.cron(name, schedule, handler);
    }
  }
}
