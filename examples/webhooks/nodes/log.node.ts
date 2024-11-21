import type { NodeExecutionContext } from "../../../src/core/execution-context.ts";
import { Node } from "../../../src/core/node.ts";
import { WebhookNodeExecutionContext } from "../../../src/runners/webhook/node-execution.context.ts";
import type { ParamsMap } from "../../../src/types/node.ts";
import type { Result } from "../../../src/types/result.ts";

interface ILogNodeParams extends ParamsMap {
  message: string;
}

export class LogNode extends Node<ILogNodeParams> {
  override execute(inputs: Result[], context: NodeExecutionContext) {
    let message = this.param("message", context);

    if (context instanceof WebhookNodeExecutionContext) {
      message = `[Its Webhook!]: ${message}`;
    }

    console.log("Log Node: ", { message });
    return [[message]];
  }
}
