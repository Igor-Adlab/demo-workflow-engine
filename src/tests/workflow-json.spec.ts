import { assertEquals } from "@test/assert";
import type { INodeSchema, ParamsMap } from "../types/node.ts";
import { Node } from "../core/node.ts";
import { Trigger } from "../core/trigger.ts";
import type { Result } from "../types/result.ts";
import type { IWorkflowJSON } from "../types/workflow.ts";
import type { INodeFactory, ITriggerFactory } from "../types/factory.ts";
import { AbstractFactory } from "../core/abstract-factory.ts";
import type { ITrigger } from "../types/trigger.ts";
import { SchemaBuilder } from "../core/schema-builder.ts";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class SyncTestNode<T extends ParamsMap> extends Node<T> {
  constructor(params: T) {
    super({ id: "test-node-sync", name: "SyncTestNode", params });
  }

  execute() {
    return [["Executed synchronously!"]];
  }
}

class AsyncTestNode<T extends ParamsMap> extends Node<T> {
  constructor(params: T) {
    super({ id: "test-node-async", name: "AsyncTestNode", params });
  }

  async execute() {
    await delay(100);
    return [["Executed asynchronously!"]];
  }
}

class SyncTestTrigger extends Trigger {
  constructor() {
    super({ id: "test-trigger-sync", name: "SyncTestTrigger" });
  }

  start(cb: (data: Result) => void): void {
    cb("SyncTrigger started");
  }

  stop(): void {
    console.log("SyncTrigger stopped");
  }
}

class AsyncTestTrigger extends Trigger {
  constructor() {
    super({ id: "test-trigger-async", name: "AsyncTestTrigger" });
  }

  async start(cb: (data: Result) => void): Promise<void> {
    await delay(50);
    cb("AsyncTrigger started");
  }

  async stop(): Promise<void> {
    await delay(50);
    console.log("AsyncTrigger stopped");
  }
}

const testWorkflowJSON: IWorkflowJSON = {
  triggers: {
    startTrigger: {
      id: "test-trigger-sync",
    },
  },
  nodes: {
    node1: {
      id: "test-node-sync",
      name: "Node 1",
      params: { key: "value1" },
    },
    node2: {
      id: "test-node-async",
      name: "Node 2",
      params: { key: "value2" },
    },
  },
  connections: {
    startTrigger: {
      main: [[{ node: "node1" }]],
    },
    node1: {
      main: [[{ node: "node2" }]],
    },
  },
};

const testWorkflowJSONWithErrors: IWorkflowJSON = {
  triggers: {
    startTrigger: {
      id: "test-trigger-sync",
    },
  },
  nodes: {
    node1: {
      id: "test-node-sync",
      name: "Node 1",
      params: { key: "value1" },
    },
    node2: {
      id: "test-node-async",
      name: "Node 2",
      params: { key: "value2" },
    },
    errorHandler: {
      id: "error-handler",
      name: "Error Handler",
      params: { key: "errorValue" },
    },
  },
  connections: {
    startTrigger: {
      main: [[{ node: "node1" }]],
    },
    node1: {
      main: [[{ node: "node2" }]],
      error: [[{ node: "errorHandler" }]],
    },
  },
};

class SyncTestNodeFactory implements INodeFactory {
  createNode<T extends ParamsMap>(schema: INodeSchema<T>) {
    if (!schema.params?.key) {
      throw new Error(`Invalid parameters for node: ${schema.id}`);
    }
    return new SyncTestNode<T>(schema.params!);
  }
}

class SyncTestTriggerFactory implements ITriggerFactory {
  createTrigger<T extends ParamsMap>(schema: ITrigger<T>) {
    if (schema.id === "invalid-trigger") {
      throw new Error(`Invalid trigger id: ${schema.id}`);
    }
    return new SyncTestTrigger();
  }
}

class ConcreteFactory extends AbstractFactory {}

Deno.test("SchemaBuilder.fromJSON with test factories", async () => {
  const factory = new ConcreteFactory(
    new SyncTestNodeFactory(),
    new SyncTestTriggerFactory(),
  );

  const builder = await SchemaBuilder.fromJSON(testWorkflowJSON, factory);

  const workflowSchema = builder.build();

  assertEquals(Object.keys(workflowSchema.triggers!).length, 1);
  assertEquals(Object.keys(workflowSchema.nodes).length, 2);
  assertEquals(Object.keys(workflowSchema.connections).length, 2);

  assertEquals(
    workflowSchema.connections.startTrigger!.main[0][0].node,
    "node1",
  );
  assertEquals(
    workflowSchema.connections.node1!.main[0][0].node,
    "node2",
  );
});

Deno.test("SchemaBuilder.fromJSON with error connections", async () => {
  const factory = new ConcreteFactory(
    new SyncTestNodeFactory(),
    new SyncTestTriggerFactory(),
  );

  const builder = await SchemaBuilder.fromJSON(
    testWorkflowJSONWithErrors,
    factory,
  );

  const workflowSchema = builder.build();

  assertEquals(Object.keys(workflowSchema.triggers!).length, 1);
  assertEquals(Object.keys(workflowSchema.nodes).length, 3);
  assertEquals(Object.keys(workflowSchema.connections).length, 2);

  assertEquals(
    workflowSchema.connections.startTrigger!.main[0][0].node,
    "node1",
  );
  assertEquals(
    workflowSchema.connections.node1!.main[0][0].node,
    "node2",
  );

  assertEquals(
    workflowSchema.connections.node1!.error![0][0].node,
    "errorHandler",
  );
});
