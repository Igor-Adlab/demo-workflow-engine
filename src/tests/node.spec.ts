import { assertEquals } from "@test/assert";
import { WorkflowExecutionContext } from "../core/execution-context.ts";
import type { INodeSchema, ParamsMap } from "../types/node.ts";
import { Node } from "../core/node.ts";

class MockNodeExecutionContext extends WorkflowExecutionContext {}

class TestNode<T extends ParamsMap> extends Node<T> {
  constructor(params: T) {
    super({ ...TEST_NODE_SCHEMA, params });
  }

  execute() {
    return [["Executed!"]];
  }
}

const TEST_NODE_SCHEMA: INodeSchema = {
  id: "test",
  name: TestNode.name,
};

Deno.test("Node.id: should return same id as in schema", () => {
  const node = new TestNode({});

  assertEquals(node.id, TEST_NODE_SCHEMA.id);
});

Deno.test("Node.param: should resolve simple string parameter", () => {
  const context = new MockNodeExecutionContext();

  context.setInput("node1", "result1");
  context.setResult("node1", [["result1"]]);

  const node = new TestNode({
    param1: "{{ $result('node1').first() }}",
    param2: 42,
  });

  const resolvedParam1 = node.param(
    "param1",
    context.getNodeExecutionContext(node.id),
  );
  const resolvedParam2 = node.param(
    "param2",
    context.getNodeExecutionContext(node.id),
  );

  assertEquals(resolvedParam1, "result1");
  assertEquals(resolvedParam2, 42);
});

Deno.test("Node.param: should handle non-existent params gracefully", () => {
  const context = new MockNodeExecutionContext();

  context.setInput("node1", "result1");
  context.setResult("node1", [["result1"]]);

  const node = new TestNode({
    param1: "{{ $result('node1').first() }}",
  });

  const resolvedParam1 = node.param(
    "param1",
    context.getNodeExecutionContext(node.id),
  );

  const resolvedParam2 = node.param(
    "param2" as any,
    context.getNodeExecutionContext(node.id),
  );

  assertEquals(resolvedParam1, "result1");
  assertEquals(resolvedParam2, null);
});

Deno.test("Node.param: should resolve parameter with object value", () => {
  const context = new MockNodeExecutionContext();

  context.setInput("node1", "nestedResult");
  context.setResult("node1", [["nestedResult"]]);

  const node = new TestNode({
    param1: {
      nestedKey: "nestedResult",
    },
  });

  const resolvedParam1 = node.param(
    "param1",
    context.getNodeExecutionContext(node.id),
  );

  assertEquals(resolvedParam1, { nestedKey: "nestedResult" });
});

Deno.test("Node.param: should handle an array parameter", () => {
  const context = new MockNodeExecutionContext();

  context.setInput("node1", "firstResult");
  context.setResult("node1", [["firstResult"]]);

  const node = new TestNode({
    param1: ["{{ $result('node1').first() }}", "staticValue"],
    param2: 42,
  });

  const resolvedParam1 = node.param(
    "param1",
    context.getNodeExecutionContext(node.id),
  );

  assertEquals(resolvedParam1, ["firstResult", "staticValue"]);
});
