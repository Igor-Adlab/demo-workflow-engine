import type { Trigger } from "../core/trigger.ts";
import type { INode, NodeId } from "./node.ts";

// deno-lint-ignore ban-types
export type SchemaNodesMap = Record<NodeId, INode<{}>>;
export interface IWorkflowConnection<NodeId = string> {
  node: NodeId;
}

export type TriggerMap = Record<string, Trigger>;

export type IWorkflowConnectionMap<
  Nodes extends SchemaNodesMap,
  Triggers extends TriggerMap,
> = {
  [K in keyof Nodes | keyof Triggers]: {
    main: IWorkflowConnection<keyof Nodes>[][];
    error?: IWorkflowConnection<keyof Nodes>[][];
  };
};

export interface IWorkflowSchema<
  Nodes extends SchemaNodesMap = SchemaNodesMap,
  Triggers extends TriggerMap = TriggerMap,
> {
  triggers?: Triggers;
  nodes: Nodes;
  connections: Partial<IWorkflowConnectionMap<Nodes, Triggers>>;
}
