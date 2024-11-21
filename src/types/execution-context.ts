import type { Result } from "./result.ts";

import type { ExecutionInputMap } from "./workflow.ts";

export interface IReadableExecutionContext {
  allInputs(nodeId: string): Result[];
  lastInput(nodeId: string): Result | null;
  firstInput(nodeId: string): Result | null;

  firstResult(nodeId: string): Result | [];
  lastResult(nodeId: string): Result | null;
  allResults(nodeId?: string): Result[] | ExecutionInputMap;
}

export interface IWorkflowExecutionContext {
  getNodeExecutionContext(nodeId: string): IReadableExecutionContext;
}
