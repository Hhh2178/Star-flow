import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const loginPageUrl = new URL("../pages/AdminLogin.vue", import.meta.url);

describe("AdminLogin form contract", () => {
  it("blocks duplicate submit and disables every submit control while loading", async () => {
    const source = await readFile(loginPageUrl, "utf8");

    expect(source).toContain("if (loading.value) return;");
    expect(source.match(/:disabled="loading"/g)).toHaveLength(3);
    expect(source).toContain(':loading="loading"');
  });

  it("links validation errors to inputs and focuses the first invalid field", async () => {
    const source = await readFile(loginPageUrl, "utf8");

    expect(source).toContain('ref="usernameInput"');
    expect(source).toContain('ref="passwordInput"');
    expect(source).toContain(':aria-invalid="Boolean(errors.username)"');
    expect(source).toContain(':aria-invalid="Boolean(errors.password)"');
    expect(source).toContain(':aria-describedby="errors.username ? \'admin-username-error\' : undefined"');
    expect(source).toContain(':aria-describedby="errors.password ? \'admin-password-error\' : undefined"');
    expect(source).toContain('id="admin-username-error"');
    expect(source).toContain('id="admin-password-error"');
    expect(source.match(/role="alert"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("usernameInput.value?.focus()");
    expect(source).toContain("passwordInput.value?.focus()");
  });
});
