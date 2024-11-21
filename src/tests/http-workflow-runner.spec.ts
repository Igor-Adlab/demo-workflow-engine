import { assertSpyCalls, spy } from "@test/mock";
import { assertEquals, assertInstanceOf } from "@test/assert";
import { Trigger } from "../core/trigger.ts";
import {
  HttpWorkflowRunner,
  WebhookExecutionContext,
  WebhookNodeExecutionContext,
} from "../runners/webhook/index.ts";
import type { IWorkflowSchema } from "../types/schema.ts";

class MockTrigger extends Trigger {
  start = spy(() => Promise.resolve());
  stop = spy(() => Promise.resolve());

  constructor(id: string, webhooks?: Record<string, any>) {
    super({
      id,
      name: MockTrigger.name,
    });

    this.webhooks = webhooks;
  }
}

Deno.test("HttpWorkflowRunner: creates correct webhook routes", () => {
  const trigger1 = new MockTrigger("trigger1", {
    webhook1: { path: "/webhook1", method: "post", wait: false },
    webhook2: { path: "/webhook2", method: "get" },
  });

  const schema: IWorkflowSchema = {
    triggers: { trigger1 },
    nodes: {},
    connections: {},
  };

  const runner = new HttpWorkflowRunner(schema);
  const router = runner.getWebhooksRouter();

  assertEquals(typeof router, "function");

  const stack = (router as any).stack;
  const routes = stack.map((layer: any) => ({
    path: layer.route.path,
    method: Object.keys(layer.route.methods)[0],
  }));

  assertEquals(routes, [
    { path: "/webhook1", method: "post" },
    { path: "/webhook2", method: "get" },
  ]);
});

Deno.test(
  "HttpWorkflowRunner: webhook handler calls handleTrigger",
  async () => {
    const trigger = new MockTrigger("trigger1", {
      webhook1: { path: "/webhook1", method: "post", wait: true },
    });

    const schema: IWorkflowSchema = {
      triggers: { trigger },
      nodes: {},
      connections: {},
    };

    const runner = new HttpWorkflowRunner(schema);
    const router = runner.getWebhooksRouter();
    const handler = router.stack[0].route.stack[0].handle;

    const mockReq = {
      url: "/webhook1",
      body: { test: "data" },
      query: { param: "value" },
      headers: { "x-test-header": "header-value" },
    };
    const mockRes = {
      json: spy((response: any) => response),
    };

    const handleTriggerSpy = spy(runner, "handleTrigger" as any);

    await handler(mockReq, mockRes);

    assertSpyCalls(handleTriggerSpy, 1);
    const [call] = handleTriggerSpy.calls;

    assertEquals(call.args[0], "trigger1");
    assertEquals(call.args[1], {
      key: "webhook1",
      url: "/webhook1",
      body: { test: "data" },
      query: { param: "value" },
      headers: { "x-test-header": "header-value" },
    });

    handleTriggerSpy.restore();
  },
);

Deno.test(
  "HttpWorkflowRunner: returns JSON immediately if wait is false",
  () => {
    const trigger = new MockTrigger("trigger1", {
      webhook1: { path: "/webhook1", method: "post", wait: false },
    });

    const schema: IWorkflowSchema = {
      triggers: { trigger },
      nodes: {},
      connections: {},
    };

    const runner = new HttpWorkflowRunner(schema);
    const router = runner.getWebhooksRouter();
    const handler = router.stack[0].route.stack[0].handle;

    const mockReq = {
      url: "/webhook1",
      body: { test: "data" },
      query: { param: "value" },
      headers: { "x-test-header": "header-value" },
    };
    const mockRes = {
      json: spy(() => {}),
    };

    handler(mockReq, mockRes);

    assertSpyCalls(mockRes.json, 1);
    assertEquals((mockRes.json.calls[0].args as any)[0], { ok: true });
  },
);

Deno.test("WebhookExecutionContext: should return request and response", () => {
  const mockReq = {
    url: "/test",
    headers: { "x-header": "value" },
  } as unknown as Request;
  const mockRes = { status: 200 } as unknown as Response;

  const context = new WebhookExecutionContext(mockReq, mockRes);

  assertEquals(context.getRequest(), mockReq);
  assertEquals(context.getResponse(), mockRes);
});

Deno.test(
  "WebhookExecutionContext: should return WebhookNodeExecutionContext",
  () => {
    const mockReq = {
      url: "/test",
      headers: { "x-header": "value" },
    } as unknown as Request;
    const mockRes = { status: 200 } as unknown as Response;

    const context = new WebhookExecutionContext(mockReq, mockRes);
    const nodeContext = context.getNodeExecutionContext("node-1");

    assertEquals(nodeContext instanceof WebhookNodeExecutionContext, true);
    assertEquals(
      (<WebhookNodeExecutionContext> nodeContext).getRequest(),
      mockReq,
    );
    assertEquals(
      (<WebhookNodeExecutionContext> nodeContext).getResponse(),
      mockRes,
    );
  },
);

Deno.test(
  "WebhookNodeExecutionContext: should access request and response from WebhookExecutionContext",
  () => {
    const mockReq = {
      url: "/test",
      headers: { "x-header": "value" },
    } as unknown as Request;
    const mockRes = { status: 200 } as unknown as Response;

    const executionContext = new WebhookExecutionContext(mockReq, mockRes);
    const nodeContext = new WebhookNodeExecutionContext(
      "node-1",
      executionContext,
    );

    assertEquals(nodeContext.getRequest(), mockReq);
    assertEquals(nodeContext.getResponse(), mockRes);
  },
);

Deno.test(
  "WebhookExecutionContext: should initialize with request and response",
  () => {
    const mockRequest = {
      url: "/test",
      body: {},
      query: {},
      headers: {},
    } as unknown as Request;
    const mockResponse = { json: spy() } as unknown as Response;

    const context = new WebhookExecutionContext(mockRequest, mockResponse);

    assertEquals(context.getRequest(), mockRequest);
    assertEquals(context.getResponse(), mockResponse);
  },
);

Deno.test(
  "WebhookExecutionContext: getNodeExecutionContext should return WebhookNodeExecutionContext",
  () => {
    const mockRequest = {
      url: "/test",
      body: {},
      query: {},
      headers: {},
    } as unknown as Request;
    const mockResponse = { json: spy() } as unknown as Response;
    const context = new WebhookExecutionContext(mockRequest, mockResponse);

    const nodeContext = context.getNodeExecutionContext("node1");

    assertInstanceOf(nodeContext, WebhookNodeExecutionContext);
    assertEquals(nodeContext.getRequest(), mockRequest);
    assertEquals(nodeContext.getResponse(), mockResponse);
  },
);

Deno.test(
  "WebhookNodeExecutionContext: should correctly retrieve request and response",
  () => {
    const mockRequest = {
      url: "/test",
      body: {},
      query: {},
      headers: {},
    } as unknown as Request;
    const mockResponse = { json: spy() } as unknown as Response;
    const context = new WebhookExecutionContext(mockRequest, mockResponse);
    const nodeContext = new WebhookNodeExecutionContext("node1", context);

    assertEquals(nodeContext.getRequest(), mockRequest);
    assertEquals(nodeContext.getResponse(), mockResponse);
  },
);

Deno.test(
  "getWebhooksRouter: should configure routes based on webhooks",
  () => {
    const mockSchema: IWorkflowSchema = {
      triggers: {
        trigger1: new MockTrigger("trigger1", {
          webhook1: {
            path: "/webhook1",
            method: "get",
          },
          webhook2: {
            path: "/webhook2",
            method: "post",
          },
        }),
      },
      nodes: {},
      connections: {},
    };

    const runner = new HttpWorkflowRunner(mockSchema);

    const router = runner.getWebhooksRouter();

    assertEquals(router.stack.length, 2);

    const [getRoute, postRoute] = router.stack;

    assertEquals(getRoute.route.path, "/webhook1");
    assertEquals(getRoute.route.methods.get, true);

    assertEquals(postRoute.route.path, "/webhook2");
    assertEquals(postRoute.route.methods.post, true);
  },
);

Deno.test(
  "getWebhooksRouter: should call getWebhookHandler for each webhook",
  () => {
    const spyHandler = spy();
    const spyCallback = spy();

    const mockSchema: IWorkflowSchema = {
      triggers: {
        trigger1: new MockTrigger("trigger1", {
          webhook1: {
            path: "/webhook1",
            method: "get",
          },
        }),
      },
      nodes: {},
      connections: {},
    };

    const runner: any = new HttpWorkflowRunner(mockSchema);

    runner["getWebhookHandler"] = (trigger: any, webhookKey: string) => {
      spyHandler(trigger, webhookKey);
      return spyCallback;
    };

    const router = runner.getWebhooksRouter();

    const handler = router.stack[0].route.stack[0].handle;

    handler({}, {}, () => {});

    assertSpyCalls(spyHandler, 1);
    const [trigger, webhookKey] = spyHandler.calls[0].args;
    assertEquals(trigger.id, "trigger1");
    assertEquals(webhookKey, "webhook1");

    assertSpyCalls(spyCallback, 1);
  },
);
