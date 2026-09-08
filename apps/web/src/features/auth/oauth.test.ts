import { afterEach, describe, expect, it } from "vitest";

import {
  consumePostLoginRedirect,
  rememberPostLoginRedirect,
  sanitizeRedirect,
} from "@/shared/auth/redirect";
import { describeOAuthError, googleLoginUrl, readCallbackParams } from "./oauth";

afterEach(() => {
  window.sessionStorage.clear();
});

describe("googleLoginUrl", () => {
  it("targets the backend login endpoint with an encoded same-site redirect", () => {
    const url = googleLoginUrl("/spaces");
    expect(url).toBe("/api/v1/auth/google/login?redirect_uri=%2Fspaces");
  });

  it("falls back to the default redirect for unsafe paths", () => {
    expect(googleLoginUrl("//evil.example.com")).toContain(
      "redirect_uri=%2Fspaces",
    );
    expect(googleLoginUrl("https://evil.example.com")).toContain(
      "redirect_uri=%2Fspaces",
    );
  });
});

describe("sanitizeRedirect", () => {
  it("keeps same-site absolute paths", () => {
    expect(sanitizeRedirect("/spaces/123/expenses")).toBe("/spaces/123/expenses");
  });

  it("rejects protocol-relative, absolute URLs and junk", () => {
    expect(sanitizeRedirect("//evil.com")).toBe("/spaces");
    expect(sanitizeRedirect("http://evil.com")).toBe("/spaces");
    expect(sanitizeRedirect("")).toBe("/spaces");
    expect(sanitizeRedirect(null)).toBe("/spaces");
  });
});

describe("post-login redirect storage", () => {
  it("round-trips a remembered path once, then falls back", () => {
    rememberPostLoginRedirect("/spaces/42/expenses");
    expect(consumePostLoginRedirect()).toBe("/spaces/42/expenses");
    // consumed — second read falls back
    expect(consumePostLoginRedirect()).toBe("/spaces");
  });

  it("sanitizes a tampered stored value", () => {
    window.sessionStorage.setItem("et.postLoginRedirect", "//evil.com");
    expect(consumePostLoginRedirect()).toBe("/spaces");
  });
});

describe("readCallbackParams", () => {
  it("extracts code, state and error", () => {
    expect(readCallbackParams(new URLSearchParams("code=abc&state=xyz"))).toEqual({
      code: "abc",
      state: "xyz",
      error: null,
    });
    expect(
      readCallbackParams(new URLSearchParams("error=access_denied")),
    ).toEqual({ code: null, state: null, error: "access_denied" });
  });
});

describe("describeOAuthError", () => {
  it("has a dedicated message for a cancelled consent", () => {
    expect(describeOAuthError("access_denied")).toMatch(/отмен/i);
  });

  it("uses a generic message otherwise and never echoes the raw code", () => {
    const msg = describeOAuthError("temporarily_unavailable");
    expect(msg).toMatch(/не удалось/i);
    expect(msg).not.toContain("temporarily_unavailable");
    expect(describeOAuthError(null)).toMatch(/не удалось/i);
  });
});
