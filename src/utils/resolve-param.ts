import _, { isObject } from "lodash";
import type { IReadableExecutionContext } from "../types/execution-context.ts";
import type { WorkflowParamValue } from "../types/node.ts";
import { JexlWrapper } from "./jexl-expression.ts";
import type { Result } from "../types/result.ts";
import type { ExecutionInputMap } from "../types/workflow.ts";

type CtxHelper = {
  last: Result | null | (() => Result | null);
  first: Result | null | (() => Result | null);
  all: ExecutionInputMap | Result[] | (() => ExecutionInputMap | Result[]);
};

export type CtxHelpersMap = {
  $input: (nodeId: string) => CtxHelper;
  $result: (nodeId: string) => CtxHelper;
};

function getTemplateContext(context: IReadableExecutionContext): CtxHelpersMap {
  return {
    $result: (nodeId: string) => ({
      all: () => context.allResults(nodeId),
      last: () => context.lastResult(nodeId),
      first: () => context.firstResult(nodeId),
    }),
    $input: (nodeId: string) => ({
      all: () => context.allInputs(nodeId),
      last: () => context.lastInput(nodeId),
      first: () => context.firstInput(nodeId),
    }),
  };
}

function getJexlTemplateContext(
  context: IReadableExecutionContext
): CtxHelpersMap {
  return {
    $result: (nodeId: string) => ({
      all: context.allResults(nodeId),
      last: context.lastResult(nodeId),
      first: context.firstResult(nodeId),
    }),
    $input: (nodeId: string) => ({
      all: context.allInputs(nodeId),
      last: context.lastInput(nodeId),
      first: context.firstInput(nodeId),
    }),
  };
}

export function evaluateTemplate(
  templateStr: string,
  context: IReadableExecutionContext
): string {
  try {
    const compiled = _.template(templateStr, {
      interpolate: /\{\{([\s\S]+?)\}\}/g,
      evaluate: /\{%([\s\S]+?)%\}/g,
      escape: /\{\{-([\s\S]+?)\}\}/g,
    });
    return compiled(getTemplateContext(context));
  } catch (err) {
    console.error("Error evaluating template:", err);
    return templateStr;
  }
}

export function resolveParam(
  param: WorkflowParamValue,
  context: IReadableExecutionContext
  // deno-lint-ignore no-explicit-any
): any {
  if (typeof param === "string") {
    return evaluateTemplate(param, context);
  } else if (JexlWrapper.isJexlExpression(param)) {
    return (param as JexlWrapper).eval(getJexlTemplateContext(context));
  }

  if (Array.isArray(param)) {
    return param.map((item) => resolveParam(item, context));
  }

  if (_.isObject(param)) {
    const resolvedObject: Record<string, WorkflowParamValue> = {};
    for (const [key, value] of Object.entries(param || {})) {
      const resolvedKey = evaluateTemplate(key, context);
      resolvedObject[resolvedKey] = resolveParam(value, context);
    }
    return resolvedObject;
  }

  return param;
}
