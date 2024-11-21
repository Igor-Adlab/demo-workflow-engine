import { Trigger } from "../../../src/core/trigger.ts";
import type { Result } from "../../../src/types/result.ts";
import type { WebhooksMap } from "../../../src/types/trigger.ts";

export class EmptyTrigger extends Trigger {
  override webhooks: WebhooksMap = {
    test: { method: "get", path: "/test", wait: true },
  };

  override stop(): void | Promise<void> {}
  override start(cb: (data: Result) => void): void | Promise<void> {}
}
