import { Request, Response, Router } from "npm:express@4.18.2";

import { WorkflowRunner } from "../../core/workflow-runner.ts";
import type { ITrigger } from "../../types/trigger.ts";
import type { Result } from "../../types/result.ts";
import { WebhookExecutionContext } from "./execution.context.ts";

export class HttpWorkflowRunner extends WorkflowRunner {
  getWebhooksRouter(): Router {
    const router = Router();
    for (const trigger of Object.values(this.schema.triggers || {})) {
      for (
        const [webhookKey, config] of Object.entries(
          trigger.webhooks || {},
        )
      ) {
        router[config.method](
          config.path,
          this.getWebhookHandler(trigger, webhookKey),
        );
      }
    }

    return router;
  }

  protected getWebhookHandler(trigger: ITrigger, key: string) {
    return (req: Request, res: Response) => {
      const data: Result = {
        key,
        url: req.url,
        body: req.body,
        query: req.query,
        headers: req.headers,
      };

      this.handleTrigger(
        trigger.id,
        data,
        new WebhookExecutionContext(req, res),
      );

      if (!trigger.webhooks![key].wait) {
        return res.json({ ok: true });
      }
    };
  }
}
