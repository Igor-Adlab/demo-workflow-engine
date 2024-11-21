import { Request, Response } from "npm:express@4.18.2";

import { WorkflowExecutionContext } from "../../core/execution-context.ts";
import { WebhookNodeExecutionContext } from "./node-execution.context.ts";

export class WebhookExecutionContext extends WorkflowExecutionContext {
  constructor(private request: Request, private response: Response) {
    super();
  }

  getRequest() {
    return this.request;
  }

  getResponse() {
    return this.response;
  }

  override getNodeExecutionContext(nodeId: string) {
    return new WebhookNodeExecutionContext(nodeId, this);
  }
}
