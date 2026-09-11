import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/shared/api/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/api/http")>();
  return { ...actual, api: apiMock };
});

vi.mock("./tokenStore", () => ({
  getAccessToken: () => "token",
  getRefreshToken: () => null,
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  subscribe: () => () => {},
}));

const { AuthProvider, useAuth } = await import("./AuthContext");

const anna = { id: "u1", email: "a@example.com", name: "Anna", avatar_url: null, created_at: "2026-01-01T00:00:00Z" };

function Probe() {
  const { user, isLoading, refreshUser } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="name">{user?.name ?? ""}</span>
      <button onClick={() => void refreshUser()}>refresh</button>
    </div>
  );
}

describe("AuthContext.refreshUser", () => {
  it("never flips isLoading, unlike the initial mount fetch", async () => {
    let resolveRefresh!: (u: unknown) => void;
    apiMock.get
      .mockResolvedValueOnce(anna) // initial mount fetch (goes through refreshMe)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("name")).toHaveTextContent("Anna"));
    expect(screen.getByTestId("loading")).toHaveTextContent("false");

    await userEvent.click(screen.getByRole("button", { name: "refresh" }));

    // the refreshUser() request is still in flight — isLoading must stay
    // false, unlike refreshMe (used for the initial/token-change fetch),
    // which would otherwise make RequireAuth unmount the whole app here.
    expect(screen.getByTestId("loading")).toHaveTextContent("false");

    resolveRefresh({ ...anna, name: "Anna Updated" });
    await waitFor(() => expect(screen.getByTestId("name")).toHaveTextContent("Anna Updated"));
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });
});
