import _ from "lodash";

import type { NodeExecutionContext } from "../../core/execution-context.ts";
import { Node } from "../../core/node.ts";
import type { ParamsMap } from "../../types/node.ts";
import type { Result } from "../../types/result.ts";
import type { JexlWrapper } from "../../utils/jexl-expression.ts";

export interface IIfNodeParams extends ParamsMap {
  condition?: JexlWrapper | string | boolean;
}

export class IfNode extends Node<IIfNodeParams> {
  override execute(inputs: Result[], context: NodeExecutionContext) {
    const trues: Result[] = [];
    const falses: Result[] = [];

    const condition = this.param("condition", context);

    if (_.isNil(condition)) {
      return [[], [inputs]];
    }

    try {
      const isTrue = this.evaluateCondition(condition);
      if (isTrue) {
        trues.push(inputs);
      } else {
        falses.push(inputs);
      }
    } catch (error) {
      console.error(`Failed to evaluate condition: ${error}`);
      falses.push(inputs);
    }

    return [trues, falses];
  }

  private evaluateCondition(condition: unknown): boolean {
    if (typeof condition === "boolean") {
      return condition;
    }

    if (typeof condition === "string") {
      try {
        return Boolean(JSON.parse(condition.trim()));
      } catch {
        return false;
      }
    }

    throw new Error(`Unsupported condition type: ${typeof condition}`);
  }
}
