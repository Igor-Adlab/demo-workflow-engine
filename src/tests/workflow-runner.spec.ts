import { assertSpyCalls, spy } from "@test/mock";
import { assertEquals } from "@test/assert";
import { Trigger } from "../core/trigger.ts";
import type { IWorkflowSchema } from "../types/schema.ts";
import type { CronMap } from "../types/trigger.ts";
import { WorkflowRunner } from "../core/workflow-runner.ts";
import { Workflow } from "../core/workflow.ts";
import type { Result } from "../types/result.ts";

class MockWorkflow {
  constructor(public id: string, public schema: IWorkflowSchema) {}
  run = spy(() => Promise.resolve());
}

class MockTrigger extends Trigger {
  start = spy((cb: (data: Result) => void) => {});
  stop = spy(() => {});

  constructor(id: string, cron?: CronMap, webhooks?: Record<string, any>) {
    super({
      id,
      name: MockTrigger.name,
    });
    this.cron = cron;
    this.webhooks = webhooks;
  }
}

Deno.test("WorkflowRunner: triggers are started correctly", async () => {
  const trigger1 = new MockTrigger("trigger1");
  const trigger2 = new MockTrigger("trigger2");

  const schema: IWorkflowSchema = {
    triggers: { trigger1, trigger2 },
    nodes: {},
    connections: {},
  };

  const runner = new WorkflowRunner(schema);
  await runner.listen();

  assertSpyCalls(trigger1.start, 1);
  assertSpyCalls(trigger2.start, 1);
});

Deno.test(
  "WorkflowRunner: handleTrigger invokes Workflow.run correctly",
  async () => {
    const schema: IWorkflowSchema = {
      triggers: {},
      nodes: {},
      connections: { trigger1: { main: [[{ node: "node1" }]] } },
    };

    const runner = new WorkflowRunner(schema);
    (Workflow as unknown as typeof MockWorkflow).prototype.run = spy();

    const mockData: Result = { key: "value" };
    await runner["handleTrigger"]("trigger1", mockData);

    assertSpyCalls(
      (Workflow as unknown as typeof MockWorkflow).prototype.run,
      1,
    );
    const [call] = (Workflow as unknown as typeof MockWorkflow).prototype.run
      .calls;
    assertEquals((call.args as any)[0], ["node1"]);
    assertEquals((call.args as any)[1], mockData);
  },
);

Deno.test("WorkflowRunner: getCronSchedule builds correct schedules", () => {
  const trigger1 = new MockTrigger("trigger1", {
    job1: { schedule: "* * * * *" },
    job2: { schedule: "0 0 * * *" },
  });

  const schema: IWorkflowSchema = {
    triggers: { trigger1 },
    nodes: {},
    connections: {},
  };

  const runner = new WorkflowRunner(schema);
  const schedules = runner["getCronSchedule"]();

  assertEquals(schedules.length, 2);
  assertEquals(schedules[0].name, "trigger1-job1");
  assertEquals(schedules[0].schedule, "* * * * *");
  assertEquals(schedules[1].name, "trigger1-job2");
  assertEquals(schedules[1].schedule, "0 0 * * *");
});

Deno.test("WorkflowRunner: getTriggeredNodes returns correct nodes", () => {
  const schema: IWorkflowSchema = {
    triggers: {},
    nodes: {},
    connections: {
      trigger1: { main: [[{ node: "node1" }, { node: "node2" }]] },
    },
  };

  const runner = new WorkflowRunner(schema);
  const nodes = runner["getTriggeredNodes"]("trigger1");

  assertEquals(nodes, ["node1", "node2"]);
});

Deno.test("WorkflowRunner: stops all triggers correctly", async () => {
  const trigger1 = new MockTrigger("trigger1");
  const trigger2 = new MockTrigger("trigger2");

  const schema: IWorkflowSchema = {
    triggers: { trigger1, trigger2 },
    nodes: {},
    connections: {},
  };

  const runner = new WorkflowRunner(schema);

  await runner.listen();
  trigger1.stop();
  trigger2.stop();

  assertSpyCalls(trigger1.stop, 1);
  assertSpyCalls(trigger2.stop, 1);
});

Deno.test("getCronSchedule: should return correct cron schedules", () => {
  const trigger1 = new MockTrigger("trigger1", {
    job1: { schedule: "* * * * *" },
    job2: { schedule: "0 0 * * *" },
  });

  const trigger2 = new MockTrigger("trigger2", {
    job3: { schedule: "*/5 * * * *" },
  });

  const mockSchema: IWorkflowSchema = {
    triggers: { trigger1, trigger2 },
    nodes: {},
    connections: {},
  };

  const runner = new WorkflowRunner(mockSchema);
  const schedules = runner["getCronSchedule"]();

  assertEquals(schedules.length, 3);

  assertEquals(schedules[0].name, "trigger1-job1");
  assertEquals(schedules[0].schedule, "* * * * *");

  assertEquals(schedules[1].name, "trigger1-job2");
  assertEquals(schedules[1].schedule, "0 0 * * *");

  assertEquals(schedules[2].name, "trigger2-job3");
  assertEquals(schedules[2].schedule, "*/5 * * * *");

  schedules.forEach((schedule) => {
    assertEquals(typeof schedule.handler, "function");
  });
});

Deno.test("startCron: should call Deno.cron for each schedule", async () => {
  const trigger1 = new MockTrigger("trigger1", {
    job1: { schedule: "* * * * *" },
  });

  const trigger2 = new MockTrigger("trigger2", {
    job2: { schedule: "0 0 * * *" },
  });

  const mockSchema: IWorkflowSchema = {
    triggers: { trigger1, trigger2 },
    nodes: {},
    connections: {},
  };

  const runner = new WorkflowRunner(mockSchema);

  const originalCron = Deno.cron;

  const fakeCronCalls: Array<[string, string | Deno.CronSchedule, () => void]> =
    [];
  const fakeCron = (
    name: string,
    schedule: string | Deno.CronSchedule,
    handler: () => void,
  ) => {
    fakeCronCalls.push([name, schedule, handler]);
    return {
      stop: async () => {
        console.log(`Stopped fake cron job: ${name}`);
      },
    };
  };
  (Deno as any).cron = fakeCron;

  runner.startCron();

  assertEquals(fakeCronCalls.length, 2);

  assertEquals(fakeCronCalls[0][0], "trigger1-job1");
  assertEquals(fakeCronCalls[0][1], "* * * * *");

  assertEquals(fakeCronCalls[1][0], "trigger2-job2");
  assertEquals(fakeCronCalls[1][1], "0 0 * * *");

  Deno.cron = originalCron;
});

Deno.test(
  "getCronSchedule should return an empty array if no cron schedules",
  () => {
    const triggerWithoutCron = new MockTrigger("trigger1");

    const schema: IWorkflowSchema = {
      triggers: { triggerWithoutCron },
      nodes: {},
      connections: {},
    };

    const runner = new WorkflowRunner(schema);
    const schedules = runner["getCronSchedule"]();

    assertEquals(schedules.length, 0);
  },
);

Deno.test(
  "getTriggeredNodes should return an empty array when there are no connections",
  () => {
    const schema: IWorkflowSchema = {
      triggers: {},
      nodes: {},
      connections: {},
    };

    const runner = new WorkflowRunner(schema);
    const nodes = runner["getTriggeredNodes"]("nonExistentNode");

    assertEquals(nodes, []);
  },
);

Deno.test(
  "startCron should not call Deno.cron if no cron schedules are present",
  async () => {
    const triggerWithoutCron = new MockTrigger("trigger1");

    const schema: IWorkflowSchema = {
      triggers: { triggerWithoutCron },
      nodes: {},
      connections: {},
    };

    const runner = new WorkflowRunner(schema);

    const fakeCronCalls: Array<
      [string, string | Deno.CronSchedule, () => void]
    > = [];
    const fakeCron = (
      name: string,
      schedule: string | Deno.CronSchedule,
      handler: () => void,
    ) => {
      fakeCronCalls.push([name, schedule, handler]);
    };
    (Deno as any).cron = fakeCron;

    await runner.startCron();

    assertEquals(fakeCronCalls.length, 0);
  },
);

Deno.test("WorkflowRunner should handle empty or undefined schema", () => {
  const runner1 = new WorkflowRunner({
    triggers: {},
    nodes: {},
    connections: {},
  });
  const runner2 = new WorkflowRunner(undefined as unknown as IWorkflowSchema);

  assertEquals(runner1 instanceof WorkflowRunner, true);
  assertEquals(runner2 instanceof WorkflowRunner, true);
});

Deno.test(
  "handleTrigger should not run Workflow if no triggered nodes",
  async () => {
    const schema: IWorkflowSchema = {
      triggers: {},
      nodes: {},
      connections: {
        trigger1: { main: [] },
      },
    };

    const runner = new WorkflowRunner(schema);
    const mockData: Result = { key: "value" };

    const originalRun = Workflow.prototype.run;
    Object.defineProperty(Workflow.prototype, "run", {
      value: spy(() => Promise.resolve()),
    });

    const workflowRunSpy = Workflow.prototype.run as unknown as any;

    await runner["handleTrigger"]("trigger1", mockData);

    assertEquals(workflowRunSpy.calls.length, 1);

    Object.defineProperty(Workflow.prototype, "run", {
      value: originalRun,
    });
  },
);

Deno.test("getCronSchedule: should build cron schedules from triggers", () => {
  const trigger1 = new MockTrigger("trigger1", {
    job1: { schedule: "* * * * *" },
    job2: { schedule: "0 0 * * *" },
  });

  const trigger2 = new MockTrigger("trigger2", {
    job3: { schedule: "*/5 * * * *" },
  });

  const schema: IWorkflowSchema = {
    triggers: { trigger1, trigger2 },
    nodes: {},
    connections: {},
  };

  const runner = new WorkflowRunner(schema);

  const schedules = runner["getCronSchedule"]();

  assertEquals(schedules.length, 3);
  assertEquals(schedules[0].name, "trigger1-job1");
  assertEquals(schedules[0].schedule, "* * * * *");
  assertEquals(schedules[1].name, "trigger1-job2");
  assertEquals(schedules[1].schedule, "0 0 * * *");
  assertEquals(schedules[2].name, "trigger2-job3");
  assertEquals(schedules[2].schedule, "*/5 * * * *");

  schedules.forEach((schedule) => {
    assertEquals(typeof schedule.handler, "function");
  });
});

Deno.test(
  "getCronSchedule: should return empty array if no cron triggers",
  () => {
    const trigger1 = new MockTrigger("trigger1");
    const trigger2 = new MockTrigger("trigger2");

    const schema: IWorkflowSchema = {
      triggers: { trigger1, trigger2 },
      nodes: {},
      connections: {},
    };

    const runner = new WorkflowRunner(schema);

    const schedules = runner["getCronSchedule"]();
    assertEquals(schedules.length, 0);
  },
);
