import type { EmptyParams, INodeSchema, ParamsMap } from "../types/node.ts";
import type {
  ITrigger,
  ITriggerCron,
  ITriggerWebhookConfig,
  TriggerCallback,
} from "../types/trigger.ts";

export abstract class Trigger<T extends ParamsMap = EmptyParams>
  implements ITrigger {
  cron?: Record<string, ITriggerCron>;
  webhooks?: Record<string, ITriggerWebhookConfig>;

  constructor(protected schema: INodeSchema<T>) {}

  get id() {
    return this.schema.id;
  }

  get type() {
    return this.schema.type || this.constructor.name;
  }

  abstract stop(): void | Promise<void>;
  abstract start(cb: TriggerCallback): void | Promise<void>;

  toJSON() {
    return {
      type: this.type,
      ...this.schema,
    };
  }
}
