import { assertEquals } from "@test/assert";
import { expr } from "../../utils/jexl-expression.ts";
import { CounterNode } from "./counter.node.ts";
import type { Result } from "../../types/result.ts";
import { WorkflowExecutionContext } from "../../core/execution-context.ts";
import { ExecutionInputMap } from "../../types/workflow.ts";

class MockExecutionContext extends WorkflowExecutionContext {
  constructor(inputs: ExecutionInputMap, results: ExecutionInputMap) {
    super();

    this.inputs = inputs;
    this.results = results;
  }
}

Deno.test("CounterNode: executes with counter and increment", async () => {
  const node = new CounterNode({
    id: "1",
    name: CounterNode.name,
    params: { counter: 5, increment: 3 },
  });

  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [[]];

  const results = await node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(results[0], [8]); // 5 + 3 = 8
});

Deno.test(
  "CounterNode: executes with Jexl expression for counter",
  async () => {
    const node = new CounterNode({
      id: "1",
      name: CounterNode.name,
      params: { counter: expr`5`, increment: 3 },
    });

    const context = new MockExecutionContext({}, {});
    const inputs: Result[] = [{ key: "value" }];

    const results = await node.execute(
      inputs,
      context.getNodeExecutionContext(node.id)
    );

    assertEquals(results[0], [8]); // 5 + 3 = 8
  }
);

Deno.test(
  "CounterNode: executes with Jexl expression for increment",
  async () => {
    const node = new CounterNode({
      id: "1",
      name: CounterNode.name,
      params: { counter: 5, increment: expr`3` },
    });

    const context = new MockExecutionContext({}, {});
    const inputs: Result[] = [{ key: "value" }];

    const results = await node.execute(
      inputs,
      context.getNodeExecutionContext(node.id)
    );

    assertEquals(results[0], [8]);
  }
);

Deno.test(
  "CounterNode: executes with Lodash template for counter",
  async () => {
    const node = new CounterNode({
      id: "1",
      name: CounterNode.name,
      params: { counter: `{{ 5 }}`, increment: 3 },
    });

    const context = new MockExecutionContext({}, {});
    const inputs: Result[] = [{ key: "value" }];

    const results = await node.execute(
      inputs,
      context.getNodeExecutionContext(node.id)
    );

    assertEquals(results[0], [8]);
  }
);

Deno.test(
  "CounterNode: executes with Lodash template for increment",
  async () => {
    const node = new CounterNode({
      id: "1",
      name: CounterNode.name,
      params: { counter: 5, increment: `{{ 3 }}` },
    });

    const context = new MockExecutionContext({}, {});
    const inputs: Result[] = [{ key: "value" }];

    const results = await node.execute(
      inputs,
      context.getNodeExecutionContext(node.id)
    );

    assertEquals(results[0], [8]);
  }
);
