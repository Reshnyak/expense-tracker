import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/shared/api/http";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
const startGoogleLogin = vi.hoisted(() => vi.fn());
const setTokens = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/api/http")>();
  return { ...actual, api: apiMock };
});

vi.mock("@/features/auth/oauth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/auth/oauth")>();
  return { ...actual, startGoogleLogin };
});

vi.mock("@/shared/auth/tokenStore", () => ({
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens,
  clearTokens: vi.fn(),
  subscribe: () => () => {},
}));

const { LoginPage } = await import("./LoginPage");
const { AuthProvider } = await import("@/shared/auth/AuthContext");

function renderPage(node: ReactNode = <LoginPage />) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>{node}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiMock.post.mockReset();
  startGoogleLogin.mockReset();
  setTokens.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("LoginPage — credentials form", () => {
  it("validates required fields without calling the API", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByText("Укажите email.")).toBeInTheDocument();
    expect(screen.getByText("Введите пароль.")).toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Пароль"), "whatever");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByText("Введите корректный email.")).toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("posts credentials and stores the token pair on success", async () => {
    apiMock.post.mockResolvedValue({
      access_token: "acc",
      refresh_token: "ref",
      expires_in: 900,
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Пароль"), "s3cret-password");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() => expect(setTokens).toHaveBeenCalledWith("acc", "ref"));
    expect(apiMock.post).toHaveBeenCalledWith("/v1/auth/login", {
      email: "user@example.com",
      password: "s3cret-password",
    });
  });

  it("shows a friendly message on 401", async () => {
    apiMock.post.mockRejectedValue(
      new HttpError(401, { code: "unauthorized", message: "invalid email or password" }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Пароль"), "wrong");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByText("Неверный email или пароль.")).toBeInTheDocument();
  });

  it("disables the submit button while the request is in flight", async () => {
    let resolve: (v: unknown) => void = () => {};
    apiMock.post.mockImplementation(
      () => new Promise((r) => (resolve = r as (v: unknown) => void)),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Пароль"), "s3cret-password");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Входим…" })).toBeDisabled(),
    );
    resolve({ access_token: "a", refresh_token: "b", expires_in: 900 });
  });
});

describe("LoginPage — other entry points", () => {
  it("starts the Google flow with the default redirect", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Войти через Google" }));

    expect(startGoogleLogin).toHaveBeenCalledWith("/spaces");
  });

  it("links to the register page", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Зарегистрируйтесь" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("dev-login still works and maps a 404", async () => {
    apiMock.post.mockRejectedValueOnce(
      new HttpError(404, { code: "not_found", message: "disabled" }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Войти под этим email" }));

    expect(await screen.findByText(/dev-login отключён/i)).toBeInTheDocument();
    expect(apiMock.post).toHaveBeenCalledWith("/v1/auth/dev-login", {
      email: "dev@example.com",
    });
  });
});
