import { assert, assertEquals } from "@test/assert";
import { Node } from "../core/node.ts";
import { Trigger } from "../core/trigger.ts";
import type { Result } from "../types/result.ts";
import { SchemaBuilder } from "../core/schema-builder.ts";

export class TestNode1 extends Node {
  constructor() {
    super({
      id: "test-node-1",
      name: TestNode1.name,
    });
  }
  execute() {
    return [["Node 1 executed"]];
  }
}

export class TestNode2 extends Node {
  constructor() {
    super({
      id: "test-node-2",
      name: TestNode2.name,
    });
  }
  execute() {
    return [["Node 2 executed"]];
  }
}

export class TestTrigger1 extends Trigger {
  constructor() {
    super({
      id: "test-trigger-1",
      name: TestTrigger1.name,
    });
  }

  override start(cb: (data: Result) => void): void | Promise<void> {}

  override stop(): void | Promise<void> {}
}

export class TestTrigger2 extends Trigger {
  constructor() {
    super({
      id: "test-trigger-2",
      name: TestTrigger2.name,
    });
  }
  override start(cb: (data: Result) => void): void | Promise<void> {}

  override stop(): void | Promise<void> {}
}

Deno.test("Test SchemaBuilder - Adding Nodes", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .node("test-node-2", new TestNode2());

  const schema = builder.build();

  assertEquals(Object.keys(schema.nodes).length, 2);
  assertEquals(schema.nodes["test-node-1"].id, "test-node-1");
  assertEquals(schema.nodes["test-node-2"].id, "test-node-2");
});

Deno.test("Test SchemaBuilder - Adding Triggers", () => {
  const builder = new SchemaBuilder();

  builder
    .trigger("test-trigger-1", new TestTrigger1())
    .trigger("test-trigger-2", new TestTrigger2());

  const schema = builder.build();

  assertEquals(Object.keys(schema.triggers || {}).length, 2);
  assertEquals(schema.triggers!["test-trigger-1"]!.id, "test-trigger-1");
  assertEquals(schema.triggers!["test-trigger-2"]!.id, "test-trigger-2");
});

Deno.test("Test SchemaBuilder - Connections", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .node("test-node-2", new TestNode2())
    .trigger("test-trigger-1", new TestTrigger1())
    .connect("test-trigger-1", ["test-node-1", "test-node-2"]);

  const schema = builder.build();

  assertEquals(schema.connections["test-trigger-1"]!.main.length, 1);
  assertEquals(
    schema.connections["test-trigger-1"]!.main[0][0].node,
    "test-node-1",
  );
  assertEquals(
    schema.connections["test-trigger-1"]!.main[0][1].node,
    "test-node-2",
  );
});

Deno.test("Test SchemaBuilder - Switch Connections", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .node("test-node-2", new TestNode2())
    .node("test-node-3", new TestNode2())
    .switch("test-node-1", {
      "condition-1": ["test-node-2"],
      "condition-2": ["test-node-3"],
    });

  const schema = builder.build();

  assertEquals(schema.connections["test-node-1"]!.main.length, 2);
  assertEquals(
    schema.connections["test-node-1"]!.main[0][0].node,
    "test-node-2",
  );
  assertEquals(
    schema.connections["test-node-1"]!.main[1][0].node,
    "test-node-3",
  );
});

Deno.test("Test SchemaBuilder - No Connections", () => {
  const builder = new SchemaBuilder();

  builder.node("test-node-1", new TestNode1());

  const schema = builder.build();

  assertEquals(Object.keys(schema.connections).length, 0);
});

Deno.test("Test SchemaBuilder - Single Connection", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .trigger("test-trigger-1", new TestTrigger1())
    .connect("test-trigger-1", ["test-node-1"]);

  const schema = builder.build();

  assertEquals(schema.connections["test-trigger-1"]!.main.length, 1);
  assertEquals(
    schema.connections["test-trigger-1"]!.main[0][0].node,
    "test-node-1",
  );
});

Deno.test("Test SchemaBuilder - Empty Nodes and Triggers", () => {
  const builder = new SchemaBuilder();

  const schema = builder.build();

  assertEquals(Object.keys(schema.nodes).length, 0);
  assertEquals(Object.keys(schema.triggers || {}).length, 0);
});

Deno.test("Test SchemaBuilder - Connect with Array", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .node("test-node-2", new TestNode2())
    .trigger("test-trigger-1", new TestTrigger1())
    .connect("test-trigger-1", ["test-node-1", "test-node-2"]);

  const schema = builder.build();

  assertEquals(schema.connections["test-trigger-1"]!.main.length, 1);
  assertEquals(
    schema.connections["test-trigger-1"]!.main[0][0].node,
    "test-node-1",
  );
  assertEquals(
    schema.connections["test-trigger-1"]!.main[0][1].node,
    "test-node-2",
  );
});

Deno.test("Test SchemaBuilder - Connect with Single Node", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .trigger("test-trigger-1", new TestTrigger1())
    .connect("test-trigger-1", "test-node-1");

  const schema = builder.build();

  assertEquals(schema.connections["test-trigger-1"]!.main.length, 1);
  assertEquals(
    schema.connections["test-trigger-1"]!.main[0][0].node,
    "test-node-1",
  );
});

Deno.test("Test SchemaBuilder - Cannot connect two triggers", () => {
  const builder = new SchemaBuilder();

  builder
    .trigger("test-trigger-1", new TestTrigger1())
    .trigger("test-trigger-2", new TestTrigger2());

  try {
    builder.connect("test-trigger-1", "test-trigger-2");
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "A trigger 'test-trigger-1' cannot connect to another trigger 'test-trigger-2'. Triggers can only connect to nodes.",
    );
  }
});

Deno.test("Test SchemaBuilder - Cannot connect node to trigger", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .trigger("test-trigger-1", new TestTrigger1());

  try {
    builder.connect("test-node-1", "test-trigger-1");
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "A node 'test-node-1' cannot connect to a trigger 'test-trigger-1'. Nodes can only connect to other nodes.",
    );
  }
});

Deno.test("Test SchemaBuilder - Invalid node instance", () => {
  const builder = new SchemaBuilder();

  try {
    builder.node("test-node-1", { id: "test-node-1" } as unknown as Node);
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "Expected instance of Node for id: test-node-1",
    );
  }
});

Deno.test("Test SchemaBuilder - Connect non-existent node or trigger", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .trigger("test-trigger-1", new TestTrigger1());

  try {
    builder.connect("test-node-1", "non-existent-node");
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "The target 'non-existent-node' does not exist in nodes or triggers.",
    );
  }

  try {
    builder.connect("non-existent-node", "test-trigger-1");
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "The source 'non-existent-node' does not exist in nodes or triggers.",
    );
  }
});

Deno.test("Test SchemaBuilder - Invalid Node instance", () => {
  const builder = new SchemaBuilder();

  try {
    builder.node("invalid-node", { id: "invalid-node" } as unknown as Node);
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "Expected instance of Node for id: invalid-node",
    );
  }
});

Deno.test("Test SchemaBuilder - Invalid source (from) in connect", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .trigger("test-trigger-1", new TestTrigger1());

  try {
    builder.connect("non-existent-source", "test-node-1");
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "The source 'non-existent-source' does not exist in nodes or triggers.",
    );
  }
});

Deno.test("Test SchemaBuilder - Invalid target in connect", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .trigger("test-trigger-1", new TestTrigger1());

  try {
    builder.connect("test-node-1", "non-existent-target");
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "The target 'non-existent-target' does not exist in nodes or triggers.",
    );
  }
});

Deno.test("Test SchemaBuilder - Initialize connections if not exists", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .trigger("test-trigger-1", new TestTrigger1())
    .connect("test-trigger-1", "test-node-1");

  const schema = builder.build();

  assertEquals(schema.connections["test-trigger-1"]!.main.length, 1);
});

Deno.test("Test SchemaBuilder - Invalid source node in switch", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .node("test-node-2", new TestNode2());

  try {
    builder.switch("non-existent-node", { "condition-1": ["test-node-2"] });
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "The source node 'non-existent-node' does not exist.",
    );
  }
});

Deno.test("Test SchemaBuilder - Invalid target node in switch", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .node("test-node-2", new TestNode2());

  try {
    builder.switch("test-node-1", { "condition-1": ["test-node-3"] });
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "The target node 'test-node-3' does not exist.",
    );
  }
});

Deno.test("Test SchemaBuilder - Adding Error Handlers", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .node("test-node-2", new TestNode2())
    .catch("test-node-1", ["test-node-2"]);

  const schema = builder.build();

  assertEquals(
    schema.connections["test-node-1"]!.error![0][0].node,
    "test-node-2",
  );
});

Deno.test("Test SchemaBuilder - Catch Error Handlers for Multiple Nodes", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .node("test-node-2", new TestNode2())
    .node("test-node-3", new TestNode2())
    .catch("test-node-1", ["test-node-2", "test-node-3"]);

  const schema = builder.build();

  assertEquals(
    schema.connections["test-node-1"]!.error![0][0].node,
    "test-node-2",
  );
  assertEquals(
    schema.connections["test-node-1"]!.error![1][0].node,
    "test-node-3",
  );
});

Deno.test("Test SchemaBuilder - Catch Error Handlers with Invalid Node", () => {
  const builder = new SchemaBuilder();

  builder.node("test-node-1", new TestNode1());

  try {
    builder.catch("test-node-1", ["non-existent-node"]);
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "Node 'test-node-1' cannot catch non-existent-node. It doesn't exist in nodes or triggers.",
    );
  }
});

Deno.test("Test SchemaBuilder - Cannot Catch Invalid Node", () => {
  const builder = new SchemaBuilder();

  builder.node("test-node-1", new TestNode1());

  try {
    builder.catch("non-existent-node", ["test-node-2"]);
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "The source node 'non-existent-node' does not exist.",
    );
  }
});

Deno.test("Test SchemaBuilder - Catch for Non-Existing Node", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .node("test-node-2", new TestNode2());

  try {
    builder.catch("test-node-1", ["non-existent-node"]);
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "Node 'test-node-1' cannot catch non-existent-node. It doesn't exist in nodes or triggers.",
    );
  }
});

Deno.test("Test SchemaBuilder - Error Handlers Do Not Affect Main Connection", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .node("test-node-2", new TestNode2())
    .catch("test-node-1", ["test-node-2"])
    .connect("test-node-1", "test-node-2");

  const schema = builder.build();

  assertEquals(
    schema.connections["test-node-1"]!.main[0][0].node,
    "test-node-2",
  );

  assertEquals(
    schema.connections["test-node-1"]!.error![0][0].node,
    "test-node-2",
  );
});

Deno.test("Test SchemaBuilder - Catch Should Override Main Connection on Error", () => {
  const builder = new SchemaBuilder();

  builder
    .node("test-node-1", new TestNode1())
    .node("test-node-2", new TestNode2())
    .catch("test-node-1", ["test-node-2"]);

  const schema = builder.build();

  assertEquals(schema.connections["test-node-1"]!.main.length, 0);
  assertEquals(
    schema.connections["test-node-1"]!.error![0][0].node,
    "test-node-2",
  );
});

Deno.test("Test SchemaBuilder - Catch with Non-Existent Handler", () => {
  const builder = new SchemaBuilder();

  builder.node("test-node-1", new TestNode1());

  try {
    builder.catch("test-node-1", ["non-existent-node"]);
    throw new Error("Test failed, exception not thrown.");
  } catch (error: any) {
    assertEquals(
      error.message,
      "Node 'test-node-1' cannot catch non-existent-node. It doesn't exist in nodes or triggers.",
    );
  }
});

Deno.test("Test SchemaBuilder - Catch with Valid Handlers", () => {
  const builder = new SchemaBuilder();

  builder.node("test-node-1", new TestNode1());
  builder.node("test-node-2", new TestNode2());

  builder.catch("test-node-1", ["test-node-2"]);

  const schema = builder.build();

  assertEquals(
    schema.connections["test-node-1"]!.error![0][0].node,
    "test-node-2",
  );
});

Deno.test("Test SchemaBuilder - Connections Creation if Not Exists", () => {
  const builder = new SchemaBuilder();

  builder.node("test-node-1", new TestNode1());
  builder.node("test-node-2", new TestNode2());

  builder.catch("test-node-1", ["test-node-2"]);

  const schema = builder.build();

  assert(schema.connections["test-node-1"]);
  assertEquals(
    schema.connections["test-node-1"]!.error![0][0].node,
    "test-node-2",
  );
});

Deno.test("Test SchemaBuilder - Adding Error Handlers to Connections", () => {
  const builder = new SchemaBuilder();

  builder.node("test-node-1", new TestNode1());
  builder.node("test-node-2", new TestNode2());

  builder.catch("test-node-1", ["test-node-2"]);

  const schema = builder.build();

  assert(schema.connections["test-node-1"]!.error);
  assertEquals(
    schema.connections["test-node-1"]!.error![0][0].node,
    "test-node-2",
  );
});
