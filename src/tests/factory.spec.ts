import { assertEquals, assertRejects } from "@test/assert";
import { Trigger } from "../core/trigger.ts";
import type { Result } from "../types/result.ts";
import type { INodeSchema, ParamsMap } from "../types/node.ts";
import { Node } from "../core/node.ts";
import type { INodeFactory, ITriggerFactory } from "../types/factory.ts";
import type { ITrigger } from "../types/trigger.ts";
import { AbstractFactory } from "../core/abstract-factory.ts";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class SyncTestNode<T extends ParamsMap> extends Node<T> {
  constructor(params: T) {
    super({ id: "test-node-sync", name: "SyncTestNode", params });
  }

  execute() {
    return [["Executed synchronously!"]];
  }
}

class AsyncTestNode<T extends ParamsMap> extends Node<T> {
  constructor(params: T) {
    super({ id: "test-node-async", name: "AsyncTestNode", params });
  }

  async execute() {
    await delay(100);
    return [["Executed asynchronously!"]];
  }
}

class SyncTestTrigger extends Trigger {
  constructor() {
    super({ id: "test-trigger-sync", name: "SyncTestTrigger" });
  }

  start(cb: (data: Result) => void): void {
    cb("SyncTrigger started");
  }

  stop(): void {
    console.log("SyncTrigger stopped");
  }
}

class AsyncTestTrigger extends Trigger {
  constructor() {
    super({ id: "test-trigger-async", name: "AsyncTestTrigger" });
  }

  async start(cb: (data: Result) => void): Promise<void> {
    await delay(50);
    cb("AsyncTrigger started");
  }

  async stop(): Promise<void> {
    await delay(50);
    console.log("AsyncTrigger stopped");
  }
}

class SyncTestNodeFactory implements INodeFactory {
  createNode<T extends ParamsMap>(schema: INodeSchema<T>) {
    if (!schema.params?.key) {
      throw new Error(`Invalid parameters for node: ${schema.id}`);
    }

    return new SyncTestNode<T>(schema.params!);
  }
}

class AsyncTestNodeFactory implements INodeFactory {
  async createNode<T extends ParamsMap>(schema: INodeSchema<T>) {
    if (!schema.params?.key) {
      throw new Error(`Invalid parameters for node: ${schema.id}`);
    }
    await delay(50);
    return new AsyncTestNode<T>(schema.params!);
  }
}

class SyncTestTriggerFactory implements ITriggerFactory {
  createTrigger<T extends ParamsMap>(schema: ITrigger<T>) {
    if (schema.id === "invalid-trigger") {
      throw new Error(`Invalid trigger id: ${schema.id}`);
    }
    return new SyncTestTrigger();
  }
}

class AsyncTestTriggerFactory implements ITriggerFactory {
  async createTrigger<T extends ParamsMap>(schema: ITrigger<T>) {
    if (!schema.id) {
      throw new Error(`Invalid trigger id: ${schema.id}`);
    }

    if (schema.id === "invalid-trigger") {
      throw new Error(`Invalid trigger id: ${schema.id}`);
    }
    await delay(50);
    return new AsyncTestTrigger();
  }
}

class ConcreteFactory extends AbstractFactory {}

Deno.test("Test Sync Node Factory creates a node", () => {
  const nodeFactory = new SyncTestNodeFactory();
  const node = nodeFactory.createNode({
    id: "test-node-sync",
    name: "Test Node Sync",
    params: { key: "value" },
  });

  assertEquals(node.id, "test-node-sync");
  assertEquals(node.type, "SyncTestNode");
});

Deno.test("Test Async Node Factory creates a node", async () => {
  const nodeFactory = new AsyncTestNodeFactory();
  const node = await nodeFactory.createNode({
    id: "test-node-async",
    name: "Test Node Async",
    params: { key: "value" },
  });

  assertEquals(node.id, "test-node-async");
  assertEquals(node.type, "AsyncTestNode");
});

Deno.test("Test Sync Trigger Factory creates a trigger", () => {
  const triggerFactory = new SyncTestTriggerFactory();
  const trigger = triggerFactory.createTrigger({
    id: "test-trigger-sync",
  });

  assertEquals(trigger.id, "test-trigger-sync");
  assertEquals(trigger.type, "SyncTestTrigger");
});

Deno.test("Test Async Trigger Factory creates a trigger", async () => {
  const triggerFactory = new AsyncTestTriggerFactory();
  const trigger = await triggerFactory.createTrigger({
    id: "test-trigger-async",
  });

  assertEquals(trigger.id, "test-trigger-async");
  assertEquals(trigger.type, "AsyncTestTrigger");
});

Deno.test("Test AbstractFactory with Sync Node and Sync Trigger", async () => {
  const nodeFactory = new SyncTestNodeFactory();
  const triggerFactory = new SyncTestTriggerFactory();
  const abstractFactory = new ConcreteFactory(nodeFactory, triggerFactory);

  const node = await abstractFactory.createNode({
    id: "test-node-sync",
    name: "Test Node Sync",
    params: { key: "value" },
  });
  const trigger = await abstractFactory.createTrigger({
    id: "test-trigger-sync",
  });

  assertEquals(node.id, "test-node-sync");
  assertEquals(trigger.id, "test-trigger-sync");
});

Deno.test(
  "Test AbstractFactory with Async Node and Async Trigger",
  async () => {
    const nodeFactory = new AsyncTestNodeFactory();
    const triggerFactory = new AsyncTestTriggerFactory();
    const abstractFactory = new ConcreteFactory(nodeFactory, triggerFactory);

    const node = await abstractFactory.createNode({
      id: "test-node-async",
      name: "Test Node Async",
      params: { key: "value" },
    });
    const trigger = await abstractFactory.createTrigger({
      id: "test-trigger-async",
    });

    assertEquals(node.id, "test-node-async");
    assertEquals(trigger.id, "test-trigger-async");
  },
);

Deno.test("Test AbstractFactory with invalid node creation", async () => {
  const invalidNodeFactory = new AsyncTestNodeFactory();
  await assertRejects(
    async () => {
      await invalidNodeFactory.createNode({
        id: "invalid-node",
        name: "Invalid Node",
        params: {},
      });
    },
    Error,
    "Invalid parameters for node: invalid-node",
  );
});

Deno.test("Test AbstractFactory with invalid trigger creation", async () => {
  const invalidTriggerFactory = new AsyncTestTriggerFactory();
  await assertRejects(
    async () => {
      await invalidTriggerFactory.createTrigger({ id: "invalid-trigger" });
    },
    Error,
    "Invalid trigger id: invalid-trigger",
  );
});

Deno.test("Test AbstractFactory with null node creation", async () => {
  const invalidNodeFactory = new AsyncTestNodeFactory();
  await assertRejects(
    async () => {
      await invalidNodeFactory.createNode({
        id: "invalid-node",
        name: "Invalid Node",
        params: {},
      });
    },
    Error,
    "Invalid parameters for node: invalid-node",
  );
});

Deno.test("Test AbstractFactory with error inside createNode", async () => {
  const faultyNodeFactory = new AsyncTestNodeFactory();
  await assertRejects(
    async () => {
      await faultyNodeFactory.createNode({
        id: "test-node",
        name: "Test Node",
        params: { key: null },
      });
    },
    Error,
    "Invalid parameters for node: test-node",
  );
});

Deno.test("Test AbstractFactory with error inside createTrigger", async () => {
  const faultyTriggerFactory = new AsyncTestTriggerFactory();
  await assertRejects(
    async () => {
      await faultyTriggerFactory.createTrigger({ id: "invalid-trigger" });
    },
    Error,
    "Invalid trigger id: invalid-trigger",
  );
});

Deno.test("Test AbstractFactory with null parameters for node", async () => {
  const faultyNodeFactory = new AsyncTestNodeFactory();
  await assertRejects(
    async () => {
      await faultyNodeFactory.createNode({
        id: "test-node",
        name: "Test Node",
        params: {},
      });
    },
    Error,
    "Invalid parameters for node: test-node",
  );
});

Deno.test("Test AbstractFactory with null parameters for trigger", async () => {
  const faultyTriggerFactory = new AsyncTestTriggerFactory();
  await assertRejects(
    async () => {
      await faultyTriggerFactory.createTrigger({
        id: "invalid-trigger",
      });
    },
    Error,
    "Invalid trigger id: invalid-trigger",
  );
});

Deno.test("Test AbstractFactory with missing parameters for node", async () => {
  const nodeFactory = new AsyncTestNodeFactory();
  await assertRejects(
    async () => {
      await nodeFactory.createNode({
        id: "test-node",
        name: "Test Node",
        params: {},
      });
    },
    Error,
    "Invalid parameters for node: test-node",
  );
});

Deno.test(
  "Test AbstractFactory with missing parameters for trigger",
  async () => {
    const triggerFactory = new AsyncTestTriggerFactory();
    await assertRejects(
      async () => {
        await triggerFactory.createTrigger({ id: "" });
      },
      Error,
      "Invalid trigger id: ",
    );
  },
);

Deno.test(
  "Test AbstractFactory with error inside createNode (invalid schema)",
  async () => {
    const faultyNodeFactory = new AsyncTestNodeFactory();
    await assertRejects(
      async () => {
        // Параметры невалидны: null
        await faultyNodeFactory.createNode({
          id: "test-node",
          name: "Test Node",
          params: { key: null },
        });
      },
      Error,
      "Invalid parameters for node: test-node",
    );
  },
);

Deno.test(
  "Test AbstractFactory with error inside createTrigger (invalid id)",
  async () => {
    const faultyTriggerFactory = new AsyncTestTriggerFactory();
    await assertRejects(
      async () => {
        await faultyTriggerFactory.createTrigger({ id: "invalid-trigger" });
      },
      Error,
      "Invalid trigger id: invalid-trigger",
    );
  },
);

Deno.test("Test null from Node and Trigger factories", async () => {
  const nullNodeFactory: INodeFactory = { createNode: () => null };
  const nullTriggerFactory: ITriggerFactory = { createTrigger: () => null };
  class NullableFactory extends AbstractFactory {}

  const factory = new NullableFactory(nullNodeFactory, nullTriggerFactory);

  await assertRejects(
    async () => {
      await factory.createTrigger({ id: "invalid-trigger" });
    },
    Error,
    "Error creating trigger: Failed to create trigger with id: invalid-trigger",
  );

  await assertRejects(
    async () => {
      await factory.createNode({ id: "invalid-node", name: "Invalid node" });
    },
    Error,
    "Error creating node: Failed to create node with id: invalid-node",
  );
});

Deno.test("Test error from Node and Trigger factories", async () => {
  const errorNodeFactory: INodeFactory = {
    createNode: () => {
      throw new Error("Node creation error");
    },
  };
  const errorTriggerFactory: ITriggerFactory = {
    createTrigger: () => {
      throw new Error("Trigger creation error");
    },
  };
  class ThrowableFactory extends AbstractFactory {}

  const factory = new ThrowableFactory(errorNodeFactory, errorTriggerFactory);

  await assertRejects(
    async () => {
      await factory.createTrigger({ id: "invalid-trigger" });
    },
    Error,
    "Error creating trigger: Trigger creation error",
  );

  await assertRejects(
    async () => {
      await factory.createNode({ id: "invalid-node", name: "Invalid node" });
    },
    Error,
    "Error creating node: Node creation error",
  );
});

Deno.test("Test non-Error object in Node and Trigger factories", async () => {
  const nonErrorNodeFactory: INodeFactory = {
    createNode: () => {
      throw { message: "Non-Error node creation" };
    },
  };
  const nonErrorTriggerFactory: ITriggerFactory = {
    createTrigger: () => {
      throw { message: "Non-Error trigger creation" };
    },
  };
  class NonErrorFactory extends AbstractFactory {}

  const factory = new NonErrorFactory(
    nonErrorNodeFactory,
    nonErrorTriggerFactory,
  );

  await assertRejects(
    async () => {
      await factory.createTrigger({ id: "invalid-trigger" });
    },
    Error,
    "Error creating trigger: [object Object]",
  );

  await assertRejects(
    async () => {
      await factory.createNode({ id: "invalid-node", name: "Invalid node" });
    },
    Error,
    "Error creating node: [object Object]",
  );
});
