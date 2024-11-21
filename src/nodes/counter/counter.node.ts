import { NodeExecutionContext } from "../../core/execution-context.ts";
import { Node } from "../../core/node.ts";
import { NodeParamType } from "../../types/node-param-type.ts";
import { ParamsMap } from "../../types/node.ts";
import { Result } from "../../types/result.ts";

export interface ICounterNodeParams extends ParamsMap {
  counter: NodeParamType<number>;
  increment: NodeParamType<number>;
}

export class CounterNode extends Node<ICounterNodeParams> {
  override execute(inputs: Result[], context: NodeExecutionContext) {
    const counter = Number(this.param("counter", context) || 0);
    const increment = Number(this.param("increment", context) || 1);

    return [[counter + increment]];
  }
}
