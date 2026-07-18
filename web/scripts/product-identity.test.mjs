import assert from "node:assert/strict";
import test from "node:test";
import { scanProductIdentity } from "./product-identity.mjs";

test("product-facing source contains no upstream promotion", async () => {
  const findings = await scanProductIdentity({ root: process.cwd(), mode: "source" });
  assert.deepEqual(findings, []);
});

test("compiled Creator and Admin contain Stars Flow identity only", async () => {
  const findings = await scanProductIdentity({ root: process.cwd(), mode: "dist" });
  assert.deepEqual(findings, []);
});
