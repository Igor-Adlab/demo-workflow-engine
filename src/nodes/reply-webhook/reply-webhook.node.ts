import { Node } from "../../../src/core/node.ts";
import { WebhookNodeExecutionContext } from "../../index.ts";
import type { Result } from "../../../src/types/result.ts";
import type { ParamsMap } from "../../../src/types/node.ts";
import { JexlWrapper } from "../../utils/jexl-expression.ts";
import { type NodeExecutionContext } from "../../../src/core/execution-context.ts";

interface IReplyNodeParams extends ParamsMap {
  body: string | JexlWrapper | Record<string, any>;
  contentType?: "text/json" | "text/html" | "text/plain";
}

export class ReplyWebhookNode extends Node<IReplyNodeParams> {
  override async execute(inputs: Result[], context: NodeExecutionContext) {
    if (!(context instanceof WebhookNodeExecutionContext)) {
      throw new Error(`Can not reply to webhook: Wrong execution context`);
    }

    const body = this.param("body", context);
    const contentType = this.param("contentType", context) || "text/plain";

    const response = context.getResponse();

    response.headers.set("content-type", contentType);
    await response.send(body);

    return [[]];
  }
}
