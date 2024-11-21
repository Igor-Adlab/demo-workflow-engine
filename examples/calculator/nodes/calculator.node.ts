import type { NodeExecutionContext } from "../../../src/core/execution-context.ts";
import { Node } from "../../../src/core/node.ts";
import type { ParamsMap } from "../../../src/types/node.ts";
import type { Result } from "../../../src/types/result.ts";

type Operation = "+" | "-" | "/" | "*" | "^";

interface ICalculatorNodeParams extends ParamsMap {
  a: number | string;
  b: number | string;
  operation: Operation;
}

export class CalculatorNode extends Node<ICalculatorNodeParams> {
  override execute(inputs: Result[], context: NodeExecutionContext) {
    let result = 0;
    const a = Number(this.param("a", context));
    const b = Number(this.param("b", context));
    const operation = this.param("operation", context);

    switch (operation) {
      case "+":
        result = a + b;
        break;
      case "-":
        result = a - b;
        break;
      case "/":
        if (b == 0) {
          throw new Error("Zero division error");
        }
        result = a / b;
        break;
      case "*":
        result = a * b;
        break;
      case "^":
        result = Math.pow(a, b);
        break;
    }

    return [[result]];
  }
}
