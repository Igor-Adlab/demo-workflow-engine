import type {
  IWorkflowSchema,
  SchemaNodesMap,
  TriggerMap,
} from "../types/schema.ts";

export function createWorkflowSchema<
  Nodes extends SchemaNodesMap,
  Triggers extends TriggerMap,
>(
  schema: IWorkflowSchema<Nodes, Triggers>,
): IWorkflowSchema<Nodes> {
  return schema;
}
