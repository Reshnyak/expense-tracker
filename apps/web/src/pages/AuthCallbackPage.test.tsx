import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
const setTokens = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/api/http")>();
  return { ...actual, api: apiMock };
});

vi.mock("@/shared/auth/tokenStore", () => ({
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens,
  clearTokens: vi.fn(),
  subscribe: () => () => {},
}));

const { AuthCallbackPage } = await import("./AuthCallbackPage");
const { AuthProvider } = await import("@/shared/auth/AuthContext");

function renderAt(search: string, tree: ReactNode = <AuthCallbackPage />) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/auth/callback${search}`]}>
          <Routes>
            <Route path="/auth/callback" element={tree} />
            <Route path="/spaces" element={<div>spaces screen</div>} />
            <Route path="/login" element={<div>login screen</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiMock.get.mockReset();
  setTokens.mockReset();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AuthCallbackPage", () => {
  it("shows a cancellation message when the provider reports access_denied", async () => {
    renderAt("?error=access_denied");

    expect(await screen.findByText(/отменили вход через google/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Вернуться ко входу" })).toBeInTheDocument();
    expect(apiMock.get).not.toHaveBeenCalled();
  });

  it("errors when the authorization code is missing", async () => {
    renderAt("?state=only-state");

    expect(await screen.findByText("Не передан код авторизации.")).toBeInTheDocument();
    expect(apiMock.get).not.toHaveBeenCalled();
  });

  it("exchanges code + state, stores tokens and navigates to the target", async () => {
    apiMock.get.mockResolvedValue({
      access_token: "acc",
      refresh_token: "ref",
      expires_in: 900,
    });

    renderAt("?code=the-code&state=the-state");

    await waitFor(() => expect(setTokens).toHaveBeenCalledWith("acc", "ref"));
    expect(apiMock.get).toHaveBeenCalledWith(
      "/v1/auth/google/callback?code=the-code&state=the-state",
    );
    expect(await screen.findByText("spaces screen")).toBeInTheDocument();
  });

  it("shows a generic error when the exchange fails", async () => {
    apiMock.get.mockRejectedValue(new Error("boom"));

    renderAt("?code=c&state=s");

    expect(
      await screen.findByText("Не удалось завершить вход. Попробуйте ещё раз."),
    ).toBeInTheDocument();
  });
});
