import type { WorkflowExecutionContext } from "../core/execution-context.ts";
import type { INodeSchema, WorkflowParamObject } from "./node.ts";
import type { Result } from "./result.ts";
import type { IWorkflowConnection } from "./schema.ts";
import type { ITrigger } from "./trigger.ts";

export interface IWorkflow {
  run(
    nodeId: string,
    data: Result,
    context: WorkflowExecutionContext,
  ): Promise<WorkflowExecutionContext>;
}

export type ActiveNodes = Map<string, boolean>;
export type ExecutionInputMap = Record<string, Result[]>;

export interface ITriggerJSON {
  id: string;
  type: string;
  params?: WorkflowParamObject;
}

export interface IWorkflowJSON {
  // deno-lint-ignore no-explicit-any
  nodes: Record<string, INodeSchema<any>>;
  triggers: Record<string, ITrigger>;
  connections: {
    [prop: string]: {
      main: IWorkflowConnection[][];
      error?: IWorkflowConnection[][];
    };
  };
  metadata?: {
    version?: string;
    enabled?: boolean;
    createdAt?: string;
    createdBy?: string;
  };
}
