import { NodeExecutionContext } from "../../src/core/execution-context.ts";
import { LocalExecutionContext } from "../../src/core/local-execution-context.ts";
import { Node } from "../../src/core/node.ts";
import { Workflow } from "../../src/core/workflow.ts";
import { createWorkflowSchema } from "../../src/index.ts";
import { CounterNode, SwitchNode } from "../../src/nodes/index.ts";
import { INodeSchema } from "../../src/types/node.ts";
import { Result } from "../../src/types/result.ts";
import { expr } from "../../src/utils/jexl-expression.ts";

class LogNode extends Node {
  constructor(
    private fn: (ctx: NodeExecutionContext) => string,
    schema: INodeSchema
  ) {
    super(schema);
  }

  override execute(inputs: Result[], context: NodeExecutionContext) {
    console.log(`[${LogNode.name}]: ${this.fn(context)}`);

    return [[]];
  }
}

const context = new LocalExecutionContext();
const schema = createWorkflowSchema({
  nodes: {
    counter: new CounterNode({
      id: "counter",
      name: CounterNode.name,
      params: {
        increment: 2,
        counter: expr`$result('counter').last || 1`,
      },
    }),
    switch: new SwitchNode({
      id: "switch",
      name: "Check counter",
      params: {
        conditions: [
          expr`$input('switch').last % 2 != 0`,
          expr`$input('switch').last % 2 == 0`,
        ],
      },
    }),
    logOdd: new LogNode(
      (ctx) => `Found odd number "${ctx.lastResult("counter")}"`,
      {
        id: "logOdd",
        name: "Logs odd numbers",
      }
    ),
    logEven: new LogNode(
      (ctx) => `Found even number "${ctx.lastResult("counter")}"`,
      {
        id: "logEven",
        name: "Logs even numbers",
      }
    ),
  },
  connections: {
    counter: {
      main: [[{ node: "switch" }]],
    },
    switch: {
      main: [[{ node: "logOdd" }], [{ node: "logEven" }]],
    },
  },
});

const workflow = new Workflow("switch-example", schema);

await workflow.run("counter", [[]], context);
