import { Trigger } from "../../../src/core/trigger.ts";
import type { Result } from "../../../src/types/result.ts";
import type { CronMap } from "../../../src/types/trigger.ts";

export class EmptyCronTrigger extends Trigger {
  override cron: CronMap = {
    test: { schedule: "*/1 * * * *" },
  };

  override stop(): void | Promise<void> {}
  override start(cb: (data: Result) => void): void | Promise<void> {}
}
