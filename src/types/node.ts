import type { NodeExecutionContext } from "../core/execution-context.ts";
import type { IReadableExecutionContext } from "./execution-context.ts";
import type { Result } from "./result.ts";

export type NodeOutput = Result[][] | null[][] | undefined[];

export type ResolvableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | object
  // deno-lint-ignore no-explicit-any
  | any[];

export type ResolvableExpression = string;

export type WorkflowParamValue =
  | ResolvableValue
  | ResolvableExpression
  | WorkflowParamObject
  | WorkflowParamArray;

export interface WorkflowParamObject {
  [key: string]: WorkflowParamValue;
}

export type WorkflowParamArray = WorkflowParamValue[];

export type NodeId = string;
export type ParamsMap = Record<string, WorkflowParamValue>;
export type EmptyParams = Record<string | number | symbol, never>;

export interface INodeSchema<T extends ParamsMap = EmptyParams> {
  id: string;
  params?: T;
  type?: string;
  name: string;
  notes?: string;
  options?: { enabled?: boolean; timeout?: number };
}

export interface INode<T extends ParamsMap = EmptyParams> {
  id: string;
  execute(
    result: Result[],
    context: NodeExecutionContext,
  ): NodeOutput | Promise<NodeOutput>;

  param<K extends keyof T>(
    key: K,
    context: IReadableExecutionContext,
  ): null | undefined | T[K];
}
