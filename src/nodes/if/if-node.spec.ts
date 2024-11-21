import { assertEquals } from "@test/assert";
import { expr } from "../../utils/jexl-expression.ts";
import type { Result } from "../../types/result.ts";
import { WorkflowExecutionContext } from "../../core/execution-context.ts";
import type { ExecutionInputMap } from "../../types/workflow.ts";
import { IfNode } from "./if.node.ts";

class MockExecutionContext extends WorkflowExecutionContext {
  constructor(inputs: ExecutionInputMap, results: ExecutionInputMap) {
    super();

    this.inputs = inputs;
    this.results = results;
  }
}

Deno.test("IfNode: executes with true boolean condition", async () => {
  const node = new IfNode({
    id: "1",
    name: IfNode.name,
    params: { condition: true },
  });
  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const [trues, falses] = await node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(falses, []);
  assertEquals(trues, [inputs]);
});

Deno.test("IfNode: executes with false boolean condition", async () => {
  const node = new IfNode({
    id: "1",
    name: IfNode.name,
    params: { condition: false },
  });
  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const [trues, falses] = await node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(trues, []);
  assertEquals(falses, [inputs]);
});

Deno.test("IfNode: executes with Jexl condition (true)", () => {
  const node = new IfNode({
    id: "1",
    name: IfNode.name,
    params: { condition: expr`(1 + 1) == 2` },
  });
  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const [trues, falses] = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(falses, []);
  assertEquals(trues, [inputs]);
});

Deno.test("IfNode: executes with Jexl condition (false)", () => {
  const node = new IfNode({
    id: "1",
    name: IfNode.name,
    params: { condition: expr`1 + 1 == 3` },
  });
  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const [trues, falses] = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(trues, []);
  assertEquals(falses, [inputs]);
});

Deno.test("IfNode: handles multiple inputs with true condition", () => {
  const node = new IfNode({
    id: "1",
    name: IfNode.name,
    params: { condition: true },
  });
  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "input1" }, { key: "input2" }];

  const [trues, falses] = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(trues, [inputs]);
  assertEquals(falses, []);
});

Deno.test("IfNode: handles multiple inputs with false condition", () => {
  const node = new IfNode({
    id: "1",
    name: IfNode.name,
    params: { condition: false },
  });
  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "input1" }, { key: "input2" }];

  const [trues, falses] = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(trues, []);
  assertEquals(falses, [inputs]);
});

Deno.test("IfNode: handles complex Jexl conditions", () => {
  const node = new IfNode({
    id: "1",
    name: IfNode.name,
    params: { condition: expr`$input('node1').all.length > 0` },
  });
  const context = new MockExecutionContext({ node1: ["input1", "input2"] }, {});
  const inputs: Result[] = [{ key: "value" }];

  const [trues, falses] = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(falses, []);
  assertEquals(trues, [inputs]);
});

Deno.test("IfNode: handles true Lodash conditions", () => {
  const node = new IfNode({
    id: "1",
    name: IfNode.name,
    params: { condition: `{{ true }}` },
  });
  const context = new MockExecutionContext({ node1: ["input1", "input2"] }, {});
  const inputs: Result[] = [{ key: "value" }];

  const [trues, falses] = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(falses, []);
  assertEquals(trues, [inputs]);
});

Deno.test("IfNode: handles false Lodash conditions", () => {
  const node = new IfNode({
    id: "1",
    name: IfNode.name,
    params: { condition: `{{ false }}` },
  });
  const context = new MockExecutionContext({ node1: ["input1", "input2"] }, {});
  const inputs: Result[] = [{ key: "value" }];

  const [trues, falses] = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(trues, []);
  assertEquals(falses, [inputs]);
});

Deno.test("IfNode: handles undefined condition gracefully", async () => {
  const node = new IfNode({
    id: "1",
    name: IfNode.name,
    params: { condition: undefined },
  });
  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const [trues, falses] = await node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(trues, []);
  assertEquals(falses, [inputs]);
});
