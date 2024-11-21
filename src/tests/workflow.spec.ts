import { assertSpyCalls, spy } from "@test/mock";
import { assertEquals, assertExists } from "@test/assert";
import { WorkflowExecutionContext } from "../core/execution-context.ts";
import { Node } from "../core/node.ts";
import type { INode, NodeOutput } from "../types/node.ts";
import type { IWorkflowSchema } from "../types/schema.ts";
import { Workflow } from "../core/workflow.ts";

class TestWorkflowExecutionContext extends WorkflowExecutionContext {}

class TestNode extends Node {
  constructor(id: string, private output: NodeOutput) {
    super({ id, name: TestNode.name });
  }

  execute() {
    return this.output;
  }
}

class ErrorNode extends Node {
  constructor(id: string, private errorMsg: string) {
    super({ id, name: ErrorNode.name });
  }

  execute(): NodeOutput {
    throw new Error(this.errorMsg);
  }
}

Deno.test("Workflow: simple execution", async () => {
  const node1 = new TestNode("node1", [["output1"]]);
  const node2 = new TestNode("node2", [["output2"]]);

  const node1ExecuteSpy = spy(node1, "execute");
  const node2ExecuteSpy = spy(node2, "execute");

  const basicSchema: IWorkflowSchema = {
    nodes: { node1, node2 },
    connections: {
      node1: { main: [[{ node: "node2" }]] },
    },
  };

  const context = new TestWorkflowExecutionContext();
  const workflow = new Workflow("test-workflow", basicSchema);
  const results = await workflow.run("node1", "input-data", context);

  assertSpyCalls(node1ExecuteSpy, 1);
  assertSpyCalls(node2ExecuteSpy, 1);

  assertExists(results);
  assertEquals(context.lastResult("node1"), "output1");
  assertEquals(context.lastResult("node2"), "output2");
});

Deno.test("Workflow: continue execution on Node.execute error", async () => {
  const node1: INode = {
    id: "1",
    param: () => null,
    execute: () => {
      throw new Error("Unknown error");
    },
  };

  const basicSchema: IWorkflowSchema = {
    nodes: { node1 },
    connections: {},
  };

  const context = new TestWorkflowExecutionContext();
  const workflow = new Workflow("test-workflow", basicSchema);

  await workflow.run("node1", "input-data", context);
});

Deno.test("Workflow: will not start with invalid nodeId", async () => {
  const node1 = new TestNode("node1", [["output1"]]);
  const node2 = new TestNode("node2", [["output2"]]);
  const basicSchema: IWorkflowSchema = {
    nodes: { node1, node2 },
    connections: {
      node1: { main: [[{ node: "node2" }]] },
    },
  };

  const context = new TestWorkflowExecutionContext();
  const workflow = new Workflow("test-workflow", basicSchema);

  await workflow.run("not-existing-node", "input-data", context);

  assertEquals(context.allResults(), {});
  assertEquals(context.lastInput("not-existing-node"), "input-data");
});

Deno.test("Workflow: should catch exception", async () => {
  const errorSchema: IWorkflowSchema = {
    nodes: {
      start: new ErrorNode("node1", "Error message"),
    },
    connections: {},
  };

  const context = new TestWorkflowExecutionContext();
  const workflow = new Workflow("test-workflow", errorSchema);

  await workflow.run("start", null, context);

  assertEquals(context.lastResult("start") instanceof Error, true);
  assertEquals((context.lastResult("start") as Error).message, "Error message");
});

Deno.test("Workflow: should pass error to next node", async () => {
  const errorSchema: IWorkflowSchema = {
    nodes: {
      start: new ErrorNode("node1", "Error message"),
      log: new TestNode("log node", []),
    },
    connections: {
      start: { main: [], error: [[{ node: "log" }]] },
    },
  };

  const context = new TestWorkflowExecutionContext();
  const workflow = new Workflow("test-workflow", errorSchema);

  await workflow.run("start", null, context);

  assertEquals(context.lastResult("start") instanceof Error, true);
  assertEquals((context.lastResult("start") as Error).message, "Error message");

  assertEquals(context.lastInput("log") instanceof Error, true);
  assertEquals((context.lastResult("start") as Error).message, "Error message");
});

Deno.test("Workflow: node with no inputs", async () => {
  const node1 = new TestNode("node1", [["output1"]]);
  const noInputSchema: IWorkflowSchema = {
    nodes: { node1 },
    connections: {},
  };

  const context = new TestWorkflowExecutionContext();
  const workflow = new Workflow("test-workflow", noInputSchema);
  const results = await workflow.run("node1", null, context);

  assertExists(results);
  assertEquals(context.lastResult("node1"), "output1");
});
