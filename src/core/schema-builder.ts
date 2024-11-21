import type {
  IWorkflowConnectionMap,
  SchemaNodesMap,
  TriggerMap,
} from "../types/schema.ts";
import { fromJSON } from "../utils/builder-from-json.ts";
import { createWorkflowSchema } from "../utils/create-schema.util.ts";
import type { Trigger } from "./trigger.ts";

import { Node } from "./node.ts";
import type { IWorkflowJSON } from "../types/workflow.ts";

export class SchemaBuilder<
  Nodes extends SchemaNodesMap = SchemaNodesMap,
  Triggers extends TriggerMap = TriggerMap,
> {
  private triggers: { [key in keyof Triggers]?: Trigger } = {};
  private nodes: { [key in keyof Nodes]?: Node } = {};
  private connections: IWorkflowConnectionMap<Nodes, Triggers> =
    {} as IWorkflowConnectionMap<Nodes, Triggers>;
  private errorHandlers: { [key: string]: Array<string> } = {};

  public static fromJSON = fromJSON;

  trigger<K extends keyof Triggers>(id: K, trigger: Triggers[K]): this {
    this.triggers[id] = trigger;
    return this;
  }

  node<K extends keyof Nodes>(id: K, node: Nodes[K]): this {
    if (!(node instanceof Node)) {
      throw new Error(`Expected instance of Node for id: ${id.toString()}`);
    }
    this.nodes[id] = node;
    return this;
  }

  connect(
    from: keyof Nodes | keyof Triggers,
    to: (keyof Nodes | keyof Triggers) | Array<keyof Nodes | keyof Triggers>,
  ): this {
    if (!(from in this.nodes || from in this.triggers)) {
      throw new Error(
        `The source '${String(from)}' does not exist in nodes or triggers.`,
      );
    }

    const targets = Array.isArray(to) ? to : [to];
    targets.forEach((target) => {
      if (!(target in this.nodes || target in this.triggers)) {
        throw new Error(
          `The target '${String(target)}' does not exist in nodes or triggers.`,
        );
      }

      if (from in this.triggers && target in this.triggers) {
        throw new Error(
          `A trigger '${
            String(
              from,
            )
          }' cannot connect to another trigger '${
            String(
              target,
            )
          }'. Triggers can only connect to nodes.`,
        );
      }

      if (from in this.nodes && target in this.triggers) {
        throw new Error(
          `A node '${String(from)}' cannot connect to a trigger '${
            String(
              target,
            )
          }'. Nodes can only connect to other nodes.`,
        );
      }
    });

    if (!this.connections[from]) {
      this.connections[from] = { main: [], error: [] };
    }

    this.connections[from]!.main.push(
      targets.map((target) => ({ node: target as string })),
    );

    return this;
  }

  catch(from: keyof Nodes, errorHandlers: (keyof Nodes | string)[]): this {
    if (!(from in this.nodes)) {
      throw new Error(`The source node '${String(from)}' does not exist.`);
    }

    errorHandlers.forEach((handler) => {
      if (!(handler in this.nodes)) {
        throw new Error(
          `Node '${String(from)}' cannot catch ${
            String(
              handler,
            )
          }. It doesn't exist in nodes or triggers.`,
        );
      }
    });

    this.errorHandlers[from as string] = errorHandlers.map(String);

    if (!this.connections[from]) {
      this.connections[from] = { main: [], error: [] };
    }

    this.connections[from]!.error = this.errorHandlers[from as string].map(
      (handler) => [{ node: handler }],
    );

    return this;
  }

  switch(from: keyof Nodes, conditions: Record<string, (keyof Nodes)[]>): this {
    if (!(from in this.nodes)) {
      throw new Error(`The source node '${String(from)}' does not exist.`);
    }

    if (!this.connections[from]) {
      this.connections[from] = { main: [], error: [] };
    }

    Object.entries(conditions).forEach(([_, targets]) => {
      targets.forEach((node) => {
        if (!(node in this.nodes)) {
          throw new Error(`The target node '${String(node)}' does not exist.`);
        }
      });
      this.connections[from]!.main.push(
        targets.map((node) => ({ node: node as string })),
      );
    });

    return this;
  }

  build() {
    const connections = this.connections;
    const triggers = this.triggers as Triggers;
    const nodes = this.nodes as unknown as Nodes;

    for (const [from, connection] of Object.entries(connections)) {
      const errorHandlers = this.errorHandlers[from as string];
      if (errorHandlers) {
        connection.error = errorHandlers.map((handler) => [{ node: handler }]);
      }
    }

    return createWorkflowSchema({
      nodes,
      triggers,
      connections,
    });
  }

  toJSON(): IWorkflowJSON {
    const triggers: Record<string, ReturnType<Trigger["toJSON"]>> = {};
    const nodes: Record<string, ReturnType<Node["toJSON"]>> = {};
    const connections: Record<
      string,
      { main: { node: string }[][]; error?: { node: string }[][] }
    > = {};

    for (const [id, trigger] of Object.entries(this.triggers)) {
      if (trigger) {
        triggers[id] = trigger.toJSON();
      }
    }

    for (const [id, node] of Object.entries(this.nodes)) {
      if (node) {
        nodes[id] = node.toJSON();
      }
    }

    for (const [id, connection] of Object.entries(this.connections)) {
      connections[id] = {
        main: connection.main.map((targets) =>
          targets.map((target) => ({ node: String(target.node) }))
        ),
        error: connection.error?.map((targets) =>
          targets.map((target) => ({ node: String(target.node) }))
        ),
      };
    }

    return { triggers, nodes, connections };
  }
}
