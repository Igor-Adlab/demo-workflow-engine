import type {
  IAbstractFactory,
  INodeFactory,
  ITriggerFactory,
} from "../types/factory.ts";
import type { INodeSchema, ParamsMap } from "../types/node.ts";
import type { ITrigger } from "../types/trigger.ts";
import type { Node } from "./node.ts";
import type { Trigger } from "./trigger.ts";

export abstract class AbstractFactory implements IAbstractFactory {
  constructor(
    protected readonly nodeFactory: INodeFactory,
    protected readonly triggerFactory: ITriggerFactory,
  ) {}

  async createNode<T extends ParamsMap>(
    schema: INodeSchema<T>,
  ): Promise<Node<T>> {
    try {
      const node = await this.nodeFactory.createNode(schema);
      if (!node) {
        throw new Error(`Failed to create node with id: ${schema.id}`);
      }
      return node;
    } catch (error) {
      throw new Error(
        `Error creating node: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async createTrigger<T extends ParamsMap>(
    schema: ITrigger<T>,
  ): Promise<Trigger<T>> {
    try {
      const trigger = await this.triggerFactory.createTrigger(schema);
      if (!trigger) {
        throw new Error(`Failed to create trigger with id: ${schema.id}`);
      }
      return trigger;
    } catch (error) {
      throw new Error(
        `Error creating trigger: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
