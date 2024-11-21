import type { Node } from "../core/node.ts";
import type { Trigger } from "../core/trigger.ts";
import type { INodeSchema, ParamsMap } from "./node.ts";
import type { ITrigger } from "./trigger.ts";

type NodeFactoryReturnType<T extends ParamsMap> = Node<T> | Promise<Node<T>>;
type TriggerFactoryReturnType<T extends ParamsMap> =
  | Trigger<T>
  | Promise<Trigger<T>>;

export interface INodeFactory {
  createNode<T extends ParamsMap>(
    schema: INodeSchema<T>,
  ): null | NodeFactoryReturnType<T>;
}

export interface ITriggerFactory {
  createTrigger<T extends ParamsMap>(
    schema: ITrigger<T>,
  ): null | TriggerFactoryReturnType<T>;
}

export interface IAbstractFactory {
  createNode<T extends ParamsMap>(schema: INodeSchema<T>): Promise<Node<T>>;
  createTrigger<T extends ParamsMap>(schema: ITrigger<T>): Promise<Trigger<T>>;
}
