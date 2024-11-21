import { isNil } from "lodash";

import { NodeExecutionContext } from "../../core/execution-context.ts";
import { Node } from "../../core/node.ts";
import { ParamsMap } from "../../types/node.ts";
import { Result } from "../../types/result.ts";
import { JexlWrapper } from "../../utils/jexl-expression.ts";

type ConditionType = boolean | string | number | null | JexlWrapper;

export interface ISwitchNode extends ParamsMap {
  defaultIndex?: number;
  conditions: ConditionType[];
}

export class SwitchNode extends Node<ISwitchNode> {
  override execute(inputs: Result[], context: NodeExecutionContext) {
    const conditions: ConditionType[] = this.param("conditions", context) || [];
    const results: Result[][] = new Array(conditions.length).fill([]);

    if (!conditions || !Array.isArray(conditions)) {
      throw new Error(`Invalid conditions list`);
    }

    let isAnyMatched = false;
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const isTrue = this.evaluateCondition(condition);
      if (isTrue) {
        isAnyMatched = true;
        results[i] = [inputs];
      }
    }

    const defaultIndex = this.param("defaultIndex", context);
    if (!isAnyMatched && !isNil(defaultIndex)) {
      results[defaultIndex] = [inputs];
    }

    return results;
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

    if (typeof condition === "number") {
      return condition !== 0; // 0 -> false, любое другое число -> true
    }

    throw new Error(`Unsupported condition type: ${typeof condition}`);
  }
}
