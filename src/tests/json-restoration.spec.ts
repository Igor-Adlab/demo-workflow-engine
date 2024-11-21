import { assertEquals } from "@test/assert";
import { Node } from "../core/node.ts";
import { Trigger } from "../core/trigger.ts";
import type { IAbstractFactory } from "../types/factory.ts";
import type { INodeSchema } from "../types/node.ts";
import type { ITrigger } from "../types/trigger.ts";
import { SchemaBuilder } from "../core/schema-builder.ts";
import type { IWorkflowJSON } from "../types/workflow.ts";

// Простые тестовые узлы
class TestNode1 extends Node {
  constructor() {
    super({ id: "test-node-1", name: "TestNode1" });
  }
  execute() {
    return [["Node 1 executed"]];
  }
}

class TestNode2 extends Node {
  constructor() {
    super({ id: "test-node-2", name: "TestNode2" });
  }
  execute() {
    return [["Node 2 executed"]];
  }
}

class TestNode3 extends Node {
  constructor() {
    super({ id: "test-node-3", name: "TestNode3" });
  }
  execute() {
    return [["Node 3 executed"]];
  }
}

class TestTrigger1 extends Trigger {
  constructor() {
    super({ id: "test-trigger-1", name: "TestTrigger1" });
  }
  override start(): void {}
  override stop(): void {}
}

class TestTrigger2 extends Trigger {
  constructor() {
    super({ id: "test-trigger-2", name: "TestTrigger2" });
  }
  override start(): void {}
  override stop(): void {}
}

// Реализация AbstractFactory для тестовых узлов и триггеров
class TestFactory implements IAbstractFactory {
  async createNode(schema: INodeSchema) {
    switch (schema.type) {
      case TestNode1.name:
        return new TestNode1();
      case TestNode2.name:
        return new TestNode2();
      case TestNode3.name:
        return new TestNode3();
      default:
        throw new Error(`Unknown node type: ${schema.type}`);
    }
  }

  async createTrigger(schema: ITrigger) {
    switch (schema.type) {
      case TestTrigger1.name:
        return new TestTrigger1();
      case TestTrigger2.name:
        return new TestTrigger2();
      default:
        throw new Error(`Unknown trigger type: ${schema.type}`);
    }
  }
}

Deno.test(
  "Test WorkflowBuilder - Create and Restore IWorkflowJSON",
  async () => {
    const factory = new TestFactory();
    const builder = new SchemaBuilder();

    builder
      .node(
        "test-node-1",
        await factory.createNode({
          id: "test-node-1",
          name: "TestNode1",
          type: TestNode1.name,
        }),
      )
      .node(
        "test-node-2",
        await factory.createNode({
          id: "test-node-2",
          name: "TestNode2",
          type: TestNode2.name,
        }),
      )
      .node(
        "test-node-3",
        await factory.createNode({
          id: "test-node-3",
          name: "TestNode3",
          type: TestNode3.name,
        }),
      )
      .trigger(
        "test-trigger-1",
        await factory.createTrigger({
          id: "test-trigger-1",
          type: TestTrigger1.name,
        }),
      )
      .trigger(
        "test-trigger-2",
        await factory.createTrigger({
          id: "test-trigger-2",
          type: TestTrigger2.name,
        }),
      )
      .connect("test-trigger-1", ["test-node-1"])
      .connect("test-node-1", ["test-node-2"])
      .switch("test-node-2", {
        true: ["test-node-1"],
        false: ["test-node-3"],
      })
      .catch("test-node-1", ["test-node-3"]);

    const json: IWorkflowJSON = builder.toJSON();

    const restoredSchema = await SchemaBuilder.fromJSON(json, factory);
    const restoredJSON = restoredSchema.toJSON();

    assertEquals(json, restoredJSON);
  },
);
