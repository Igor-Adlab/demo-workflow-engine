import { LocalExecutionContext } from "../../src/core/local-execution-context.ts";
import { Workflow } from "../../src/core/workflow.ts";
import { createWorkflowSchema } from "../../src/index.ts";
import { CounterNode, IfNode } from "../../src/nodes/index.ts";
import { expr } from "../../src/utils/jexl-expression.ts";

const context = new LocalExecutionContext();
const schema = createWorkflowSchema({
  nodes: {
    counter: new CounterNode({
      id: "counter",
      name: CounterNode.name,
      params: {
        increment: 1,
        counter: expr`$result('counter').last`,
      },
    }),
    check: new IfNode({
      id: "check",
      name: "Check counter",
      params: {
        condition: expr`$result('counter').last < 10`,
      },
    }),
  },
  connections: {
    counter: {
      main: [[{ node: "check" }]],
    },
    check: {
      main: [[{ node: "counter" }], []],
    },
  },
});

const workflow = new Workflow("loop-example", schema);

await workflow.run("counter", [[]], context);

console.log("Counter: ", context.lastResult("counter"));
