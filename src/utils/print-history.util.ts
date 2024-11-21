import type { Result } from "../types/result.ts";

// deno-lint-ignore no-explicit-any
export function printHistory(snapshot: Record<string, any>) {
  const history: string[] = [];
  const { inputs, results } = snapshot;

  for (const nodeId in inputs) {
    const nodeInputs = inputs[nodeId];
    const nodeResults = results[nodeId];

    history.push(`Node: ${nodeId}`);
    nodeInputs.forEach((input: Result, index: number) => {
      history.push(`  Input: ${JSON.stringify(input)}`);
      if (nodeResults && nodeResults[index]) {
        history.push(`  Result: ${JSON.stringify(nodeResults[index])}`);
      } else {
        history.push(`  Result: No result`);
      }
    });
  }

  return history.join("\n");
}
