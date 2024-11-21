import { Request, Response } from "npm:express@4.18.2";

import { NodeExecutionContext } from "../../core/execution-context.ts";
import type { WebhookExecutionContext } from "./execution.context.ts";

export class WebhookNodeExecutionContext extends NodeExecutionContext {
  constructor(nodeId: string, ctx: WebhookExecutionContext) {
    super(nodeId, ctx);
  }

  getRequest(): Request {
    return (<WebhookExecutionContext> (
      this.workflowExecutionContext
    )).getRequest();
  }

  getResponse(): Response {
    return (<WebhookExecutionContext> (
      this.workflowExecutionContext
    )).getResponse();
  }
}
