import { createWorkflowSchema } from "../../src/utils/create-schema.util.ts";
import { WorkflowExecutionContext } from "../../src/core/execution-context.ts";
import { CalculatorNode } from "./nodes/calculator.node.ts";
import { Workflow } from "../../src/core/workflow.ts";

class LocalExecutionContext extends WorkflowExecutionContext {}

const schema = createWorkflowSchema({
  nodes: {
    "step-1": new CalculatorNode({
      id: "step-1",
      name: CalculatorNode.name,
      params: {
        a: "{{ $input('step-1').first() }}",
        b: 2,
        operation: "*",
      },
    }),
    "step-2": new CalculatorNode({
      id: "step-1",
      name: CalculatorNode.name,
      params: {
        a: '{{ $result("step-1").last() }}',
        b: 5,
        operation: "*",
      },
    }),
  },
  connections: {
    "step-1": {
      main: [[{ node: "step-2" }]],
    },
  },
});

const context = new LocalExecutionContext();
const workflow = new Workflow("calculator", schema);

console.log("Workflow started...");
await workflow.run("step-1", 10, context);

console.log("Result: ", { result: context.lastResult("step-2") });
