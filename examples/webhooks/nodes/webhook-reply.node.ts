import { Node } from "../../../src/core/node.ts";
import type { Result } from "../../../src/types/result.ts";
import type { ParamsMap } from "../../../src/types/node.ts";
import { type NodeExecutionContext } from "../../../src/core/execution-context.ts";
import { WebhookNodeExecutionContext } from "../../../src/runners/webhook/index.ts";

interface IReplyNodeParams extends ParamsMap {
  body: string;
  contentType?: "text/json" | "text/html" | "text/plain";
}

export class ReplyNode extends Node<IReplyNodeParams> {
  override async execute(inputs: Result[], context: NodeExecutionContext) {
    const body = this.param("body", context);
    const contentType = this.param("contentType", context) || "text/plain";

    if (context instanceof WebhookNodeExecutionContext) {
      const response = context.getResponse();

      response.setHeader("content-type", contentType);
      await response.send(body);
    }
    return [[]];
  }
}
