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

const { RegisterPage } = await import("./RegisterPage");
const { AuthProvider } = await import("@/shared/auth/AuthContext");

function renderPage(node: ReactNode = <RegisterPage />) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/register"]}>{node}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

async function fill(user: ReturnType<typeof userEvent.setup>, over: Partial<Record<
  "name" | "email" | "password" | "confirm",
  string
>> = {}) {
  await user.type(screen.getByLabelText("Имя (необязательно)"), over.name ?? "Тест");
  await user.type(screen.getByLabelText("Email"), over.email ?? "new@example.com");
  await user.type(screen.getByLabelText("Пароль"), over.password ?? "s3cret-password");
  await user.type(screen.getByLabelText("Повторите пароль"), over.confirm ?? "s3cret-password");
}

beforeEach(() => {
  apiMock.post.mockReset();
  startGoogleLogin.mockReset();
  setTokens.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("RegisterPage", () => {
  it("renders the form and a link back to sign in", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Регистрация" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Войдите" })).toHaveAttribute("href", "/login");
  });

  it("rejects mismatched passwords without calling the API", async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, { confirm: "different-password" });
    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    expect(await screen.findByText("Пароли не совпадают.")).toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("rejects a short password", async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, { password: "short", confirm: "short" });
    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    expect(await screen.findByText(/не короче 8 символов/i)).toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("registers and stores the token pair on success", async () => {
    apiMock.post.mockResolvedValue({
      access_token: "acc",
      refresh_token: "ref",
      expires_in: 900,
    });
    const user = userEvent.setup();
    renderPage();

    await fill(user);
    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    await waitFor(() => expect(setTokens).toHaveBeenCalledWith("acc", "ref"));
    expect(apiMock.post).toHaveBeenCalledWith("/v1/auth/register", {
      email: "new@example.com",
      password: "s3cret-password",
      name: "Тест",
    });
  });

  it("explains a 409 duplicate email", async () => {
    apiMock.post.mockRejectedValue(
      new HttpError(409, { code: "conflict", message: "email already registered" }),
    );
    const user = userEvent.setup();
    renderPage();

    await fill(user);
    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    expect(
      await screen.findByText("Пользователь с таким email уже зарегистрирован."),
    ).toBeInTheDocument();
  });

  it("offers Google sign-up", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Зарегистрироваться через Google" }));

    expect(startGoogleLogin).toHaveBeenCalledWith("/spaces");
  });
});
