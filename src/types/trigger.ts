import type { EmptyParams, ParamsMap } from "./node.ts";
import type { Result } from "./result.ts";

export interface ITriggerWebhookConfig {
  path: string;
  wait?: boolean;
  method: "get" | "post" | "put" | "patch" | "delete";
}

export interface ITriggerCron {
  schedule: string | Deno.CronSchedule;
}

export type CronMap = Record<string, ITriggerCron>;
export type WebhooksMap = Record<string, ITriggerWebhookConfig>;

export type TriggerCallback = (data: Result) => void;

export interface ITrigger<T extends ParamsMap = EmptyParams> {
  id: string;

  type?: string;
  notes?: string;
  options?: { enabled?: boolean; timeout?: number };

  params?: T;
  cron?: CronMap;
  webhooks?: WebhooksMap;
}
