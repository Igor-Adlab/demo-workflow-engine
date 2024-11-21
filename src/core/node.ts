import _ from "lodash";
import type {
  EmptyParams,
  INode,
  INodeSchema,
  NodeOutput,
  ParamsMap,
} from "../types/node.ts";
import type { Result } from "../types/result.ts";
import { resolveParam } from "../utils/resolve-param.ts";
import type { NodeExecutionContext } from "./execution-context.ts";

export abstract class Node<T extends ParamsMap = EmptyParams>
  implements INode<T>
{
  constructor(protected schema: INodeSchema<T>) {}

  abstract execute(
    inputs: Result[],
    context: NodeExecutionContext
  ): NodeOutput | Promise<NodeOutput>;

  get id() {
    return this.schema.id;
  }

  get type() {
    return this.schema?.type || this.constructor.name;
  }

  param<K extends keyof T>(key: K, context: NodeExecutionContext) {
    if (!_.has(this.schema.params, key)) {
      return null;
    }

    return resolveParam(this.schema.params?.[key], context);
  }

  toJSON() {
    return {
      type: this.type,
      ...this.schema,
    };
  }
}
