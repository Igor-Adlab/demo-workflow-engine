import _ from "lodash";

import type { Result } from "../types/result.ts";
import type {
  IReadableExecutionContext,
  IWorkflowExecutionContext,
} from "../types/execution-context.ts";
import type { ExecutionInputMap } from "../types/workflow.ts";
import type { NodeOutput } from "../types/node.ts";

export class NodeExecutionContext implements IReadableExecutionContext {
  constructor(
    protected nodeId: string,
    protected workflowExecutionContext: WorkflowExecutionContext,
  ) {}

  inputs() {
    return this.workflowExecutionContext.allInputs(this.nodeId);
  }

  allInputs(nodeId: string) {
    return this.workflowExecutionContext.allInputs(nodeId);
  }

  lastInput(nodeId: string): Result | null {
    return this.workflowExecutionContext.lastInput(nodeId);
  }

  firstInput(nodeId: string): Result | null {
    return this.workflowExecutionContext.firstInput(nodeId);
  }

  allResults(nodeId?: string) {
    return this.workflowExecutionContext.allResults(nodeId);
  }

  firstResult(
    nodeId: string,
    branch: null | number = 0,
    parallel: null | number = 0,
  ): Result | [] {
    return this.workflowExecutionContext.firstResult(nodeId, branch, parallel);
  }

  lastResult(
    nodeId: string,
    branch: null | number = 0,
    parallel: null | number = 0,
  ): Result | null {
    return this.workflowExecutionContext.lastResult(nodeId, branch, parallel);
  }
}

export abstract class WorkflowExecutionContext
  implements IReadableExecutionContext, IWorkflowExecutionContext {
  protected inputs: ExecutionInputMap = {};
  protected results: ExecutionInputMap = {};

  snapshot() {
    return { inputs: this.inputs, results: this.results };
  }

  setInput(nodeId: string, data: Result) {
    (this.inputs[nodeId] ??= []).push(data);
  }

  setResult(nodeId: string, data: NodeOutput) {
    (this.results[nodeId] ??= []).push(data);
  }

  allResults(nodeId?: string) {
    if (nodeId) {
      return this.results[nodeId] || [];
    }

    return this.results;
  }

  lastResult(
    nodeId: string,
    branch: null | number = 0,
    parallel: null | number = 0,
  ) {
    let result = _.last(this.results[nodeId]) || [];

    if (Array.isArray(result) && !_.isNull(branch)) {
      result = _.get(result, branch, []);
    }

    if (Array.isArray(result) && !_.isNull(parallel)) {
      result = _.get(result, parallel, null);
    }

    return result;
  }

  firstResult(
    nodeId: string,
    branch: null | number = 0,
    parallel: null | number = 0,
  ) {
    let result = _.first(this.results[nodeId]) || null;

    if (Array.isArray(result) && !_.isNull(branch)) {
      result = _.get(result, branch, []);
    }

    if (Array.isArray(result) && !_.isNull(parallel)) {
      result = _.get(result, parallel, null);
    }

    return result;
  }

  allInputs(nodeId: string) {
    return this.inputs[nodeId] || [];
  }

  lastInput(nodeId: string) {
    return _.last(this.inputs[nodeId]);
  }

  firstInput(nodeId: string) {
    return _.first(this.inputs[nodeId]);
  }

  getNodeExecutionContext(nodeId: string) {
    return new NodeExecutionContext(nodeId, this);
  }
}
