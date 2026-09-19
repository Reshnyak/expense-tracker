import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Balance, Expense, Space, SpaceMember } from "@/shared/api/types";

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

vi.mock("@/shared/auth/tokenStore", () => ({
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  subscribe: () => () => {},
}));

const { DashboardPage } = await import("./DashboardPage");
const { AuthProvider } = await import("@/shared/auth/AuthContext");

const space: Space = {
  id: "s1",
  name: "Поездка",
  currency: "USD",
  owner_id: "u1",
  created_at: "2026-01-01T00:00:00Z",
};

const members: SpaceMember[] = [
  {
    space_id: "s1",
    user_id: "u1",
    role: "owner",
    joined_at: "2026-01-01T00:00:00Z",
    user: {
      id: "u1",
      email: "anna@example.com",
      name: "Анна",
      avatar_url: null,
      created_at: "2026-01-01T00:00:00Z",
    },
  },
  {
    space_id: "s1",
    user_id: "u2",
    role: "member",
    joined_at: "2026-01-02T00:00:00Z",
    user: {
      id: "u2",
      email: "boris@example.com",
      name: "Борис",
      avatar_url: null,
      created_at: "2026-01-02T00:00:00Z",
    },
  },
];

const balances: Balance[] = [
  { user_id: "u1", paid_cents: 10000, share_cents: 5000, net_cents: 5000 },
  { user_id: "u2", paid_cents: 0, share_cents: 5000, net_cents: -5000 },
];

function makeExpenses(count: number): Expense[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `e${i + 1}`,
    space_id: "s1",
    payer_id: i % 2 === 0 ? "u1" : "u2",
    category_id: null,
    amount_cents: (i + 1) * 100,
    currency: "USD",
    description: `Расход ${i + 1}`,
    spent_at: `2026-09-${String((i % 28) + 1).padStart(2, "0")}`,
    created_by: "u1",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  }));
}

function mountGet(expenses: Expense[]) {
  apiMock.get.mockImplementation((url: string) => {
    if (url === "/v1/spaces") return Promise.resolve([space]);
    if (url.endsWith("/members")) return Promise.resolve(members);
    if (url.endsWith("/categories")) return Promise.resolve([]);
    if (url.endsWith("/balances")) return Promise.resolve(balances);
    if (url.includes("/expenses")) return Promise.resolve({ items: expenses, next_cursor: null });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/spaces/s1"]}>
          <Routes>
            <Route path="/spaces/:spaceId" element={<DashboardPage />} />
            <Route path="/spaces" element={<div>spaces screen</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiMock.get.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("DashboardPage", () => {
  it("paginates expenses ten per page", async () => {
    mountGet(makeExpenses(12));
    renderDashboard();

    expect(await screen.findByRole("heading", { name: "Поездка" })).toBeInTheDocument();
    expect(await screen.findByText("Расход 1")).toBeInTheDocument();
    expect(screen.getByText("Расход 10")).toBeInTheDocument();
    expect(screen.queryByText("Расход 11")).not.toBeInTheDocument();
    expect(screen.getByText("Всего: 12")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Вперёд" }));

    expect(await screen.findByText("Расход 11")).toBeInTheDocument();
    expect(screen.getByText("Расход 12")).toBeInTheDocument();
    expect(screen.queryByText("Расход 1")).not.toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("resolves member names in the balances card", async () => {
    mountGet(makeExpenses(2));
    renderDashboard();

    const card = (await screen.findByText("Балансы")).closest("[data-slot=card]") as HTMLElement;
    expect(within(card).getByText("Анна")).toBeInTheDocument();
    expect(within(card).getByText("Борис")).toBeInTheDocument();
    expect(within(card).getByText("должны вернуть")).toBeInTheDocument();
    expect(within(card).getByText("нужно доплатить")).toBeInTheDocument();
    // total spent = sum of paid_cents (10000 + 0)
    expect(within(card).getByText(/Всего потрачено/)).toBeInTheDocument();
    expect(within(card).getAllByText(/100,00/).length).toBeGreaterThan(0);
    // uncategorised expenses roll up into a breakdown row
    expect(within(card).getByText("Без категории")).toBeInTheDocument();
  });

  it("opens the new-expense dialog", async () => {
    mountGet(makeExpenses(1));
    renderDashboard();

    await userEvent.click(await screen.findByRole("button", { name: /Добавить расход/ }));

    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("Новый расход"));
  });
});
