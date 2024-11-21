import { assertEquals } from "@test/assert";
import { WorkflowExecutionContext } from "../../core/execution-context.ts";
import type { Result } from "../../types/result.ts";
import type { ExecutionInputMap } from "../../types/workflow.ts";

import { SwitchNode } from "./switch.node.ts";
import { expr } from "../../utils/jexl-expression.ts";

class MockExecutionContext extends WorkflowExecutionContext {
  constructor(inputs: ExecutionInputMap, results: ExecutionInputMap) {
    super();
    this.inputs = inputs;
    this.results = results;
  }
}

Deno.test("SwitchNode: executes with matching condition", () => {
  const node = new SwitchNode({
    id: "1",
    name: SwitchNode.name,
    params: { conditions: [false, true, false] },
  });

  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const results = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(results[0], []);
  assertEquals(results[1], [inputs]);
  assertEquals(results[2], []);
});

Deno.test("SwitchNode: executes without any match, uses defaultIndex", () => {
  const node = new SwitchNode({
    id: "1",
    name: SwitchNode.name,
    params: { conditions: [false, false, false], defaultIndex: 2 },
  });

  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const results = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(results[0], []);
  assertEquals(results[1], []);
  assertEquals(results[2], [inputs]);
});

Deno.test("SwitchNode: executes without match and no defaultIndex", () => {
  const node = new SwitchNode({
    id: "1",
    name: SwitchNode.name,
    params: { conditions: [false, false, false] },
  });

  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const results = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(results[0], []);
  assertEquals(results[1], []);
  assertEquals(results[2], []); // No default, empty results
});

Deno.test("SwitchNode: matches only the first true condition", () => {
  const node = new SwitchNode({
    id: "1",
    name: SwitchNode.name,
    params: { conditions: [true, true, false] },
  });

  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const results = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(results[0], [inputs]);
  assertEquals(results[1], [inputs]);
  assertEquals(results[2], []);
});

Deno.test("SwitchNode: throws error for invalid conditions", () => {
  const node = new SwitchNode({
    id: "1",
    name: SwitchNode.name,
    params: { conditions: "not-an-array" } as any,
  });

  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  try {
    node.execute(inputs, context.getNodeExecutionContext(node.id));
    throw new Error("Test should have failed");
  } catch (error: any) {
    assertEquals(error.message, "Invalid conditions list");
  }
});

Deno.test("SwitchNode: processes string conditions safely", () => {
  const node = new SwitchNode({
    id: "1",
    name: SwitchNode.name,
    params: { conditions: ["true", "false", "invalid"] },
  });

  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const results = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(results[0], [inputs]);
  assertEquals(results[1], []);
  assertEquals(results[2], []);
});

Deno.test("SwitchNode: handles numerical conditions", () => {
  const node = new SwitchNode({
    id: "1",
    name: SwitchNode.name,
    params: { conditions: [0, 1, -1] },
  });

  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const results = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(results[0], []); // 0 is false
  assertEquals(results[1], [inputs]); // 1 is true
  assertEquals(results[2], [inputs]); // -1 is treated as true
});

Deno.test("SwitchNode: uses defaultIndex when no conditions match", () => {
  const node = new SwitchNode({
    id: "1",
    name: SwitchNode.name,
    params: {
      conditions: [false, false, false],
      defaultIndex: 2, // Указан индекс для default ветки
    },
  });

  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const results = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(results[0], []);
  assertEquals(results[1], []);
  assertEquals(results[2], [inputs]);
});

Deno.test("SwitchNode: executes with Jexl conditions", () => {
  const node = new SwitchNode({
    id: "1",
    name: SwitchNode.name,
    params: {
      conditions: [expr`(1 + 1) == 2`, expr`(2 + 2) == 5`],
      defaultIndex: 1,
    },
  });

  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const results = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(results[0], [inputs]); // (1 + 1) == 2: true
  assertEquals(results[1], []); // (2 + 2) == 5: false
});

Deno.test("SwitchNode: executes with Lodash templates", () => {
  const node = new SwitchNode({
    id: "1",
    name: SwitchNode.name,
    params: {
      conditions: [`{{ true }}`, `{{ false }}`],
      defaultIndex: 1,
    },
  });

  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const results = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(results[0], [inputs]); // Lodash `{{ true }}`: true
  assertEquals(results[1], []); // Lodash `{{ false }}`: false
});

Deno.test("SwitchNode: executes with defaultIndex using expressions", () => {
  const node = new SwitchNode({
    id: "1",
    name: SwitchNode.name,
    params: {
      conditions: [expr`false`, `{{ false }}`],
      defaultIndex: 2,
    },
  });

  const context = new MockExecutionContext({}, {});
  const inputs: Result[] = [{ key: "value" }];

  const results = node.execute(
    inputs,
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(results[0], []); // Jexl `false`: false
  assertEquals(results[1], []); // Lodash `{{ false }}`: false
  assertEquals(results[2], [inputs]); // Default branch
});
