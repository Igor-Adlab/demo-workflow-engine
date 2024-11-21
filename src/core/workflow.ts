import type { NodeOutput } from "../types/node.ts";
import type { Result } from "../types/result.ts";
import type { IWorkflowSchema } from "../types/schema.ts";
import type { ActiveNodes, IWorkflow } from "../types/workflow.ts";
import type { WorkflowExecutionContext } from "./execution-context.ts";

export class Workflow implements IWorkflow {
  constructor(
    private readonly workflowId: string,
    private schema: IWorkflowSchema,
  ) {}

  async run(
    nodes: string | string[],
    data: Result,
    context: WorkflowExecutionContext,
  ): Promise<WorkflowExecutionContext> {
    const active: ActiveNodes = new Map<string, boolean>();

    if (Array.isArray(nodes)) {
      for (const nodeId of nodes) {
        active.set(nodeId, true);
        context.setInput(nodeId, data);
      }
    } else {
      active.set(nodes, true);
      context.setInput(nodes, data);
    }

    while (active.size > 0) {
      const promises: Promise<unknown>[] = [];
      for (const nodeId of active.keys()) {
        this.unsetActive(nodeId, active);
        const node = this.schema.nodes[nodeId];

        if (!node) {
          console.log(`Node ${nodeId} not found!`);
          continue;
        }

        const args = context.allInputs(nodeId);
        const promise = Promise.resolve(
          (async () =>
            await node.execute(
              args,
              context.getNodeExecutionContext(nodeId),
            ))(),
        )
          .then((outputs) => {
            context.setResult(nodeId, outputs);
            this.processMainOutputs(nodeId, outputs, active, context);
          })
          .catch((error) => {
            context.setResult(nodeId, [[error]]);
            this.processErrorOutputs(error, nodeId, active, context);
          });

        promises.push(promise);
      }

      await Promise.all(promises);
    }

    return context;
  }

  private processMainOutputs(
    nodeId: string,
    outputs: NodeOutput,
    active: ActiveNodes,
    context: WorkflowExecutionContext,
  ) {
    const connections = this.schema.connections[nodeId];
    if (!connections || !connections.main.length) {
      console.log(`Node ${nodeId} has no connections`);
      return;
    }

    for (let i = 0; i < connections.main.length; i++) {
      const args = outputs[i] || [];
      const connection = connections.main[i];
      connection.forEach((target, index) => {
        // if Node.execute returns undefined / null
        // but it can be processed by next nodes
        if (index <= args.length - 1) {
          const result = args[index];
          this.pushToActive(target.node, active);
          this.pushToInputs(target.node, result, context);
        }
      });
    }
  }

  private processErrorOutputs(
    error: Error,
    nodeId: string,
    active: ActiveNodes,
    context: WorkflowExecutionContext,
  ) {
    const connections = this.schema.connections[nodeId]?.error;
    if (!connections || !connections.length) return;

    connections.forEach((errorConnection) => {
      errorConnection.forEach((target) => {
        this.pushToActive(target.node, active);
        this.pushToInputs(target.node, error, context);
      });
    });
  }

  private pushToInputs(
    nodeId: string,
    output: Result,
    context: WorkflowExecutionContext,
  ) {
    context.setInput(nodeId, output);
  }

  private pushToActive(nodeId: string, active: ActiveNodes) {
    active.set(nodeId, true);
  }

  private unsetActive(nodeId: string, active: ActiveNodes) {
    active.delete(nodeId);
  }
}
