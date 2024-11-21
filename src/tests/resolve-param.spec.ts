import { assertEquals } from "@test/assert";
import { WorkflowExecutionContext } from "../core/execution-context.ts";
import { evaluateTemplate, resolveParam } from "../utils/resolve-param.ts";
import type { ExecutionInputMap } from "../types/workflow.ts";
import type { WorkflowParamValue } from "../types/node.ts";
import { expr } from "../utils/jexl-expression.ts";

class MockExecutionContext extends WorkflowExecutionContext {
  constructor(inputs: ExecutionInputMap, results: ExecutionInputMap) {
    super();

    this.inputs = inputs;
    this.results = results;
  }
}

Deno.test(
  "evaluateTemplate: correctly evaluates simple template strings",
  () => {
    const context = new MockExecutionContext(
      { node1: ["input1", "input2"] },
      { node1: ["result1", "result2"] }
    );

    const template = "Last result: {{ $result('node1').last() }}";
    const output = evaluateTemplate(template, context);

    assertEquals(output, "Last result: result2");
  }
);

Deno.test("evaluateTemplate: handles missing values gracefully", () => {
  const context = new MockExecutionContext({}, {});

  const template = "Last result: {{ $result('node1').last() }}";
  const output = evaluateTemplate(template, context);

  assertEquals(output, "Last result: ");
});

Deno.test("evaluateTemplate: handles object querying", () => {
  const context = new MockExecutionContext(
    {},
    {
      node1: [{ ok: true, message: "Some message" }],
    }
  );

  const template = "Last result: {{ $result('node1').last().message }}";
  const output = evaluateTemplate(template, context);

  assertEquals(output, "Last result: Some message");
});

Deno.test("evaluateTemplate: handles array querying", () => {
  const context = new MockExecutionContext(
    {},
    {
      node1: [[{ ok: true, message: "Some message" }]],
    }
  );

  const template = "Last result: {{ $result('node1').last().message }}";
  const output = evaluateTemplate(template, context);

  assertEquals(output, "Last result: Some message");
});

Deno.test("resolveParam: resolves string templates", () => {
  const context = new MockExecutionContext(
    { node1: ["input1", "input2"] },
    { node1: ["result1", "result2"] }
  );

  const param: WorkflowParamValue =
    "Node result: {{ $result('node1').first() }}";
  const resolved = resolveParam(param, context);

  assertEquals(resolved, "Node result: result1");
});

Deno.test("resolveParam: resolves arrays with templates", () => {
  const context = new MockExecutionContext(
    { node1: ["input1", "input2"] },
    { node1: ["result1", "result2"] }
  );

  const param: WorkflowParamValue = [
    "{{ $result('node1').first() }}",
    "{{ $result('node1').last() }}",
  ];
  const resolved = resolveParam(param, context);

  assertEquals(resolved, ["result1", "result2"]);
});

Deno.test("resolveParam: resolves objects with templates", () => {
  const context = new MockExecutionContext(
    { node1: ["input1", "input2"] },
    { node1: ["result1", "result2"] }
  );

  const param: WorkflowParamValue = {
    key1: "{{ $result('node1').first() }}",
    key2: "{{ $result('node1').last() }}",
  };
  const resolved = resolveParam(param, context);

  assertEquals(resolved, {
    key1: "result1",
    key2: "result2",
  });
});

Deno.test("resolveParam: handles nested structures", () => {
  const context = new MockExecutionContext(
    { node1: ["input1", "input2"] },
    { node1: ["result1", "result2"] }
  );

  const param: WorkflowParamValue = {
    key1: "{{ $result('node1').first() }}",
    key2: ["{{ $result('node1').last() }}", "static value"],
    key3: {
      nestedKey: "{{ $input('node1').first() }}",
    },
  };
  const resolved = resolveParam(param, context);

  assertEquals(resolved, {
    key1: "result1",
    key2: ["result2", "static value"],
    key3: {
      nestedKey: "input1",
    },
  });
});

Deno.test(
  "resolveParam: returns text value for invalid template syntax",
  () => {
    const context = new MockExecutionContext(
      { node1: ["input1", "input2"] },
      { node1: ["result1", "result2"] }
    );

    const param: WorkflowParamValue = {
      key1: "{{ $result('node1').first() ",
    };

    const resolved = resolveParam(param, context);

    assertEquals(resolved, {
      key1: "{{ $result('node1').first() ",
    });
  }
);

Deno.test(
  "resolveParam: catch lodash template error if variable not found",
  () => {
    const context = new MockExecutionContext(
      { node1: ["input1", "input2"] },
      { node1: ["result1", "result2"] }
    );

    const param: WorkflowParamValue = {
      key1: "{{ $some.method() }}",
    };

    const resolved = resolveParam(param, context);

    assertEquals(resolved, {
      key1: "{{ $some.method() }}",
    });
  }
);

Deno.test("resolveParam: resolves Jexl expressions with $result", () => {
  const context = new MockExecutionContext(
    {},
    { node1: [{ key: "value1" }, { key: "value2" }] }
  );

  const param: WorkflowParamValue = expr`$result('node1').last.key`;
  const resolved = resolveParam(param, context);

  assertEquals(resolved, "value2");
});

Deno.test("resolveParam: resolves Jexl expressions with $input", () => {
  const context = new MockExecutionContext(
    { node1: [{ key: "inputValue" }] },
    {}
  );

  const param: WorkflowParamValue = expr`$input('node1').first.key`;
  const resolved = resolveParam(param, context);

  assertEquals(resolved, "inputValue");
});

Deno.test("resolveParam: resolves complex Jexl expressions", () => {
  const context = new MockExecutionContext(
    {},
    {
      node1: [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ],
    }
  );

  const param: WorkflowParamValue = expr`$result('node1').all`;
  const resolved = resolveParam(param, context);

  assertEquals(resolved, [
    { a: 1, b: 2 },
    { a: 3, b: 4 },
  ]);
});

Deno.test("resolveParam: handles Jexl syntax errors gracefully", () => {
  const context = new MockExecutionContext({}, {});

  const param: WorkflowParamValue = expr`$result('node1').unknownMethod()`;
  const resolved = resolveParam(param, context);

  assertEquals(resolved, null);
});

Deno.test("resolveParam: handles arrays with Jexl expressions", () => {
  const context = new MockExecutionContext(
    { node1: ["input1", "input2"] },
    { node1: ["result1", "result2"] }
  );

  const param: WorkflowParamValue = [
    expr`$result('node1').first`,
    expr`$input('node1').last`,
  ];
  const resolved = resolveParam(param, context);

  assertEquals(resolved, ["result1", "input2"]);
});

Deno.test("resolveParam: resolves objects with Jexl expressions", () => {
  const context = new MockExecutionContext(
    { node1: ["input1"] },
    { node1: ["result1"] }
  );

  const param: WorkflowParamValue = {
    key1: expr`$result('node1').first`,
    key2: expr`$input('node1').first`,
  };
  const resolved = resolveParam(param, context);

  assertEquals(resolved, {
    key1: "result1",
    key2: "input1",
  });
});

Deno.test("resolveParam: handles mixed Lodash and Jexl expressions", () => {
  const context = new MockExecutionContext(
    { node1: ["input1"] },
    { node1: ["result1"] }
  );

  const param: WorkflowParamValue = {
    key1: "{{ $result('node1').last() }}",
    key2: expr`$input('node1').first`,
  };
  const resolved = resolveParam(param, context);

  assertEquals(resolved, {
    key1: "result1",
    key2: "input1",
  });
});
