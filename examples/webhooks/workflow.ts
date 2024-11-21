import express from "npm:express@4.18.2";
import { EmptyTrigger } from "./triggers/empty-http.trigger.ts";
import { EmptyCronTrigger } from "./triggers/empty-cron.trigger.ts";
import { LogNode } from "./nodes/log.node.ts";
import { ReplyNode } from "./nodes/webhook-reply.node.ts";
import { HttpWorkflowRunner } from "../../src/runners/webhook/index.ts";
import { createWorkflowSchema } from "../../src/utils/create-schema.util.ts";

const PORT = Deno.env.get("PORT") || 3030;

const app = express();
const runner = new HttpWorkflowRunner(createWorkflowSchema({
  triggers: {
    "empty-cron-trigger": new EmptyCronTrigger({
      id: "empty-cron-trigger",
      name: EmptyCronTrigger.name,
    }),
    "empty-trigger": new EmptyTrigger({
      id: "empty-trigger",
      name: EmptyTrigger.name,
    }),
  },
  nodes: {
    "cron-log-1": new LogNode({
      id: "cron-log-1",
      name: LogNode.name,
      params: {
        message: "Cron tik!",
      },
    }),
    "log-1": new LogNode({
      id: "log-1",
      name: LogNode.name,
      params: {
        message:
          "[Log 1 node ? {{ $input('log-1').last().query?.l1 || 'No query param l1' }}]: Hello world!",
      },
    }),
    "log-2": new LogNode({
      id: "log-2",
      name: LogNode.name,
      params: {
        message:
          "[Log 2 node ? {{ $input('log-2').last().query?.l2 || 'No query param l2' }}]: Some log 2!",
      },
    }),
    reply: new ReplyNode({
      id: "reply",
      name: ReplyNode.name,
      params: {
        contentType: "text/json",
        body:
          '["{{ $result("log-1").last() }}", "{{ $result("log-2").last() }}"]',
      },
    }),
  },
  connections: {
    "empty-trigger": {
      main: [[{ node: "log-1" }, { node: "log-2" }]],
    },
    "log-1": {
      main: [[{ node: "reply" }]],
    },
    "empty-cron-trigger": {
      main: [[{ node: "cron-log-1" }]],
    },
  },
}));

runner.startCron();
app.use(runner.getWebhooksRouter());

Promise.all([runner.listen(), app.listen(PORT)]).then(() =>
  console.log(`Webhooks server running on ${PORT}`)
);
