import { SchemaBuilder } from "../core/schema-builder.ts";
import type { IAbstractFactory } from "../types/factory.ts";
import type { SchemaNodesMap, TriggerMap } from "../types/schema.ts";
import type { IWorkflowJSON } from "../types/workflow.ts";

export async function fromJSON(
  workflowJSON: IWorkflowJSON,
  factory: IAbstractFactory,
): Promise<SchemaBuilder> {
  const builder = new SchemaBuilder();
  const processed: Set<string> = new Set();
  const processElement = async (id: string) => {
    if (processed.has(id)) return;

    if (workflowJSON.triggers[id]) {
      const trigger = await factory.createTrigger(workflowJSON.triggers[id]);
      builder.trigger(id as keyof TriggerMap, trigger);
    } else if (workflowJSON.nodes[id]) {
      const node = await factory.createNode(workflowJSON.nodes[id]);
      builder.node(id as keyof SchemaNodesMap, node);
    } else {
      throw new Error(`Element '${id}' does not exist in nodes or triggers.`);
    }

    processed.add(id);
  };

  for (const triggerId of Object.keys(workflowJSON.triggers)) {
    await processElement(triggerId);
  }

  for (const nodeId of Object.keys(workflowJSON.nodes)) {
    await processElement(nodeId);
  }

  const buildDependencyGraph = (): Record<string, string[]> => {
    const graph: Record<string, string[]> = {};

    for (const [from, connection] of Object.entries(workflowJSON.connections)) {
      if (!graph[from]) graph[from] = [];

      // Добавляем зависимости для main
      connection.main.forEach((targets) => {
        targets.forEach((target) => {
          if (!graph[from]) graph[from] = [];
          graph[from].push(target.node);
        });
      });

      if (connection.error) {
        connection.error.forEach((targets) => {
          targets.forEach((target) => {
            if (!graph[from]) graph[from] = [];
            graph[from].push(target.node);
          });
        });
      }
    }

    return graph;
  };

  const tarjanSCC = (graph: Record<string, string[]>): string[][] => {
    const index: Record<string, number> = {};
    const lowlink: Record<string, number> = {};
    const onStack: Set<string> = new Set();
    const stack: string[] = [];
    const sccs: string[][] = [];
    let currentIndex = 0;

    const strongconnect = (v: string): void => {
      index[v] = currentIndex;
      lowlink[v] = currentIndex;
      currentIndex++;
      stack.push(v);
      onStack.add(v);

      for (const w of graph[v] || []) {
        if (!(w in index)) {
          strongconnect(w);
          lowlink[v] = Math.min(lowlink[v], lowlink[w]);
        } else if (onStack.has(w)) {
          lowlink[v] = Math.min(lowlink[v], index[w]);
        }
      }

      if (lowlink[v] === index[v]) {
        const scc: string[] = [];
        let w;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          scc.push(w);
        } while (w !== v);
        sccs.push(scc);
      }
    };

    for (const node in graph) {
      if (!(node in index)) {
        strongconnect(node);
      }
    }

    return sccs;
  };

  const graph = buildDependencyGraph();

  const sccs = tarjanSCC(graph);

  for (const component of sccs) {
    for (const id of component) {
      await processElement(id);
    }
  }

  for (const [from, connection] of Object.entries(workflowJSON.connections)) {
    connection.main.forEach((to) => {
      builder.connect(
        from,
        to.map(({ node }) => node),
      );
    });

    if (connection.error && connection.error.length) {
      const errors = connection.error.flatMap((list) =>
        list.map(({ node }) => node)
      );
      builder.catch(from, errors);
    }
  }

  return builder;
}
