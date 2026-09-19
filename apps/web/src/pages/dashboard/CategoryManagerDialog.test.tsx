import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Category } from "@/shared/api/types";

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

const { CategoryManagerDialog } = await import("./CategoryManagerDialog");

function food(overrides: Partial<Category> = {}): Category {
  return {
    id: "c1",
    space_id: "s1",
    name: "Food",
    color: "#111111",
    icon: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function renderDialog(categories: Category[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <CategoryManagerDialog spaceId="s1" categories={categories}>
        <button>Открыть</button>
      </CategoryManagerDialog>
    </QueryClientProvider>,
  );
  const rerenderWith = (next: Category[]) =>
    utils.rerender(
      <QueryClientProvider client={queryClient}>
        <CategoryManagerDialog spaceId="s1" categories={next}>
          <button>Открыть</button>
        </CategoryManagerDialog>
      </QueryClientProvider>,
    );
  return { ...utils, rerenderWith };
}

describe("CategoryManagerDialog — CategoryRow prop resync", () => {
  it("resyncs an untouched row when the category prop changes externally (e.g. another member's edit)", async () => {
    const { rerenderWith } = renderDialog([food()]);
    await userEvent.click(screen.getByRole("button", { name: "Открыть" }));
    expect(await screen.findByDisplayValue("Food")).toBeInTheDocument();

    // Simulate a refetch bringing in someone else's rename while this row is
    // mounted and untouched.
    rerenderWith([food({ name: "Groceries" })]);

    expect(await screen.findByDisplayValue("Groceries")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Food")).not.toBeInTheDocument();
    // Not "dirty": the row must not look like it's about to re-save a stale
    // value over the change that just landed.
    expect(screen.getByRole("button", { name: "Сохранить категорию" })).toBeDisabled();
  });

  it("keeps an in-progress edit when the category prop changes underneath it", async () => {
    const { rerenderWith } = renderDialog([food()]);
    await userEvent.click(screen.getByRole("button", { name: "Открыть" }));
    const nameInput = await screen.findByDisplayValue("Food");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "My Draft");

    // An unrelated external change lands while the user is mid-edit.
    rerenderWith([food({ name: "Groceries" })]);

    expect(screen.getByDisplayValue("My Draft")).toBeInTheDocument();
  });
});
