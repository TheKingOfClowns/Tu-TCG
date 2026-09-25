import assert from "node:assert/strict";
import test from "node:test";
import { createSyncHandler } from "./handler.mjs";

const env = (name) => ({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "public-key" })[name];

test("rejects requests without a bearer token before creating a Supabase client", async () => {
  let clientCreated = false;
  const handler = createSyncHandler(() => {
    clientCreated = true;
    throw new Error("should not create a client");
  }, env);
  const response = await handler(new Request("https://edge.test", { method: "POST" }));

  assert.equal(response.status, 401);
  assert.equal(clientCreated, false);
});

test("uses the authenticated user's token and ignores a forged user_id body field", async () => {
  let rpcArgs;
  let clientOptions;
  const handler = createSyncHandler((_url, _key, options) => {
    clientOptions = options;
    return {
      auth: { getUser: async () => ({ data: { user: { id: "verified-user" } }, error: null }) },
      rpc: async (_name, args) => { rpcArgs = args; return { error: null }; },
    };
  }, env);
  const response = await handler(new Request("https://edge.test", {
    method: "POST",
    headers: { Authorization: "Bearer valid-token", "Content-Type": "application/json" },
    body: JSON.stringify({ binder_id: "binder-1", cards: [], user_id: "attacker" }),
  }));

  assert.equal(response.status, 200);
  assert.equal(clientOptions.global.headers.Authorization, "Bearer valid-token");
  assert.equal("p_user_id" in rpcArgs, false);
});

test("rejects non-array cards without calling the RPC", async () => {
  let rpcCalled = false;
  const handler = createSyncHandler(() => ({
    auth: { getUser: async () => ({ data: { user: { id: "verified-user" } }, error: null }) },
    rpc: async () => { rpcCalled = true; return { error: null }; },
  }), env);
  const response = await handler(new Request("https://edge.test", {
    method: "POST",
    headers: { Authorization: "Bearer valid-token", "Content-Type": "application/json" },
    body: JSON.stringify({ binder_id: "binder-1", cards: {} }),
  }));

  assert.equal(response.status, 400);
  assert.equal(rpcCalled, false);
});

test("does not allow unrelated pages.dev origins", async () => {
  const handler = createSyncHandler(() => { throw new Error("unused"); }, env);
  const response = await handler(new Request("https://edge.test", {
    method: "OPTIONS",
    headers: { Origin: "https://attacker.pages.dev" },
  }));

  assert.equal(response.headers.has("Access-Control-Allow-Origin"), false);
});
