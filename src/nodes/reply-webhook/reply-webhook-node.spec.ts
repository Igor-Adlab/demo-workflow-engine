import { assertEquals, assertRejects } from "@test/assert";
import { ReplyWebhookNode } from "./reply-webhook.node.ts";
import { WebhookExecutionContext } from "../../index.ts";
import { expr } from "../../utils/jexl-expression.ts";
import { WorkflowExecutionContext } from "../../core/execution-context.ts";
import { ExecutionInputMap } from "../../types/workflow.ts";

class MockExecutionContext extends WorkflowExecutionContext {
  constructor(inputs: ExecutionInputMap, results: ExecutionInputMap) {
    super();

    this.inputs = inputs;
    this.results = results;
  }
}

export class MockResponse {
  public headers: Map<string, string>;
  public body: unknown | null;

  constructor() {
    this.headers = new Map();
    this.body = null;
  }

  setHeader(key: string, value: string) {
    this.headers.set(key.toLowerCase(), value);
  }

  getHeader(key: string): string | undefined {
    return this.headers.get(key.toLowerCase());
  }

  async send(body: unknown) {
    this.body = body;
  }

  reset() {
    this.headers.clear();
    this.body = null;
  }
}

Deno.test("ReplyWebhookNode: sends plain text response", async () => {
  const node = new ReplyWebhookNode({
    id: "1",
    name: ReplyWebhookNode.name,
    params: { body: "Hello, World!", contentType: "text/plain" },
  });

  const mockResponse = new MockResponse();
  const context = new WebhookExecutionContext({}, mockResponse);

  const results = await node.execute(
    [],
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(mockResponse.headers.get("content-type"), "text/plain");
  assertEquals(mockResponse.body, "Hello, World!");
  assertEquals(results, [[]]);
});

Deno.test("ReplyWebhookNode: sends JSON response", async () => {
  const node = new ReplyWebhookNode({
    id: "1",
    name: ReplyWebhookNode.name,
    params: { body: { message: "Success" }, contentType: "text/json" },
  });

  const mockResponse = new MockResponse();
  const context = new WebhookExecutionContext({}, mockResponse);

  const results = await node.execute(
    [],
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(mockResponse.headers.get("content-type"), "text/json");
  assertEquals(mockResponse.body, { message: "Success" });
  assertEquals(results, [[]]);
});

Deno.test("ReplyWebhookNode: throws error for non-webhook context", () => {
  const node = new ReplyWebhookNode({
    id: "1",
    name: ReplyWebhookNode.name,
    params: { body: "Invalid Context" },
  });

  const context: any = new MockExecutionContext({}, {});

  assertRejects(
    async () => {
      await node.execute([], context.getNodeExecutionContext());
    },
    Error,
    "Can not reply to webhook: Wrong execution context"
  );
});

Deno.test("ReplyWebhookNode: supports Jexl expressions in body", async () => {
  const node = new ReplyWebhookNode({
    id: "1",
    name: ReplyWebhookNode.name,
    params: { body: expr`"Hello " + $result("1").last.userName` },
  });

  const mockResponse = new MockResponse();
  const context = new WebhookExecutionContext({}, mockResponse);

  context.setResult(node.id, [[{ userName: "Alice" }]]);

  const results = await node.execute(
    [],
    context.getNodeExecutionContext(node.id)
  );

  assertEquals(mockResponse.body, "Hello Alice");
  assertEquals(results, [[]]);
});

Deno.test(
  "ReplyWebhookNode: uses default content type if not specified",
  async () => {
    const node = new ReplyWebhookNode({
      id: "1",
      name: ReplyWebhookNode.name,
      params: { body: "Default Content Type Test" },
    });

    const mockResponse = new MockResponse();
    const context = new WebhookExecutionContext({}, mockResponse);

    const results = await node.execute(
      [],
      context.getNodeExecutionContext(node.id)
    );

    assertEquals(mockResponse.headers.get("content-type"), "text/plain");
    assertEquals(mockResponse.body, "Default Content Type Test");
    assertEquals(results, [[]]);
  }
);

Deno.test(
  "ReplyWebhookNode: supports Jexl expressions in body - returns Object",
  async () => {
    const node = new ReplyWebhookNode({
      id: "1",
      name: ReplyWebhookNode.name,
      params: { body: expr`$result("1").last` },
    });

    const mockResponse = new MockResponse();
    const context = new WebhookExecutionContext({}, mockResponse);

    context.setResult(node.id, [[{ userName: "Alice" }]]);

    const results = await node.execute(
      [],
      context.getNodeExecutionContext(node.id)
    );

    assertEquals(mockResponse.body, context.lastResult(node.id));
    assertEquals(results, [[]]);
  }
);

Deno.test(
  "ReplyWebhookNode: supports Jexl expressions in body - returns Array",
  async () => {
    const node = new ReplyWebhookNode({
      id: "1",
      name: ReplyWebhookNode.name,
      params: { body: expr`$result("1").all` },
    });

    const mockResponse = new MockResponse();
    const context = new WebhookExecutionContext({}, mockResponse);

    context.setResult(node.id, [[{ userName: "Alice" }]]);

    const results = await node.execute(
      [],
      context.getNodeExecutionContext(node.id)
    );

    assertEquals(mockResponse.body, [[[context.lastResult(node.id)]]]);
    assertEquals(results, [[]]);
  }
);
