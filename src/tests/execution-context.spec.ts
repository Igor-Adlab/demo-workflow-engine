import _ from "lodash";
import { assertEquals } from "@test/assert";
import { WorkflowExecutionContext } from "../core/execution-context.ts";

class ErrorHandlingExecutionContext extends WorkflowExecutionContext {}

class BulkDataExecutionContext extends WorkflowExecutionContext {
  constructor() {
    super();
    ["input1", "input2", "input3"].forEach((input) =>
      this.setInput("node1", input)
    );
    ["output1", "output2", "output3"].forEach((output) =>
      this.setResult("node1", [[output]])
    );
  }
}

Deno.test(
  "ErrorHandlingExecutionContext: should handle missing inputs gracefully",
  () => {
    const context = new ErrorHandlingExecutionContext();

    const nodeExecutionContext = context.getNodeExecutionContext("node-1");

    const allInputsNode1 = nodeExecutionContext.allInputs("node1");
    const lastInputNode1 = nodeExecutionContext.lastInput("node1");
    const firstInputNode1 = nodeExecutionContext.firstInput("node1");

    const allResultsNode1 = nodeExecutionContext.allResults("node1");
    const lastResultNode1 = nodeExecutionContext.lastResult("node1");
    const firstResultNode1 = nodeExecutionContext.firstResult("node1");

    assertEquals(allInputsNode1, []);
    assertEquals(lastInputNode1, undefined);
    assertEquals(firstInputNode1, undefined);

    assertEquals(allResultsNode1, []);
    assertEquals(lastResultNode1, null);
    assertEquals(firstResultNode1, null);
  },
);

Deno.test(
  "BulkDataExecutionContext: should handle multiple inputs and results",
  () => {
    const context = new BulkDataExecutionContext();

    const nodeExecutionContext = context.getNodeExecutionContext("node1");

    const allInputsNode1 = nodeExecutionContext.allInputs("node1");
    const lastInputNode1 = nodeExecutionContext.lastInput("node1");
    const firstInputNode1 = nodeExecutionContext.firstInput("node1");

    const allResultsNode1 = nodeExecutionContext.allResults("node1");
    const lastResultNode1 = nodeExecutionContext.lastResult("node1");
    const firstResultNode1 = nodeExecutionContext.firstResult("node1");

    assertEquals(allInputsNode1, ["input1", "input2", "input3"]);
    assertEquals(lastInputNode1, "input3");
    assertEquals(firstInputNode1, "input1");

    assertEquals(allResultsNode1, [
      [["output1"]],
      [["output2"]],
      [["output3"]],
    ]);
    assertEquals(lastResultNode1, "output3");
    assertEquals(firstResultNode1, "output1");
  },
);

Deno.test(
  "BulkDataExecutionContext: should handle duplicate inputs and results",
  () => {
    const context = new BulkDataExecutionContext();

    const nodeExecutionContext = context.getNodeExecutionContext("node1");

    context.setInput("node1", "input1");
    context.setResult("node1", [["output1"]]);

    const allInputsNode1 = nodeExecutionContext.allInputs("node1");
    const lastInputNode1 = nodeExecutionContext.lastInput("node1");
    const firstInputNode1 = nodeExecutionContext.firstInput("node1");

    const allResultsNode1 = nodeExecutionContext.allResults("node1");
    const lastResultNode1 = nodeExecutionContext.lastResult("node1");
    const firstResultNode1 = nodeExecutionContext.firstResult("node1");

    assertEquals(allInputsNode1, ["input1", "input2", "input3", "input1"]);
    assertEquals(lastInputNode1, "input1");
    assertEquals(firstInputNode1, "input1");

    assertEquals(allResultsNode1, [
      [["output1"]],
      [["output2"]],
      [["output3"]],
      [["output1"]],
    ]);
    assertEquals(lastResultNode1, "output1");
    assertEquals(firstResultNode1, "output1");
  },
);

Deno.test(
  "BulkDataExecutionContext: should return all inputs and results correctly",
  () => {
    const context = new BulkDataExecutionContext();

    const nodeExecutionContext = context.getNodeExecutionContext("node1");

    const allInputsNode1 = nodeExecutionContext.allInputs("node1");
    const allResultsNode1 = nodeExecutionContext.allResults("node1");

    assertEquals(allInputsNode1, ["input1", "input2", "input3"]);

    assertEquals(allResultsNode1, [
      [["output1"]],
      [["output2"]],
      [["output3"]],
    ]);
  },
);
