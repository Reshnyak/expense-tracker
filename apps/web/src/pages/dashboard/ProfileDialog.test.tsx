import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  getAccessToken: () => "token",
  getRefreshToken: () => null,
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  subscribe: () => () => {},
}));

const { ProfileDialog } = await import("./ProfileDialog");
const { AuthProvider } = await import("@/shared/auth/AuthContext");

const me = {
  id: "u1",
  email: "anna@example.com",
  name: "Анна Иванова",
  first_name: "Анна",
  last_name: "Иванова",
  phone: "+7 900 000 00 00",
  avatar_url: null,
  created_at: "2026-01-01T00:00:00Z",
};

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileDialog open onOpenChange={() => {}} />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiMock.get.mockReset();
  apiMock.patch.mockReset();
  apiMock.get.mockResolvedValue(me);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ProfileDialog", () => {
  it("prefills from the current user and shows email read-only", async () => {
    renderDialog();
    // wait until the async /me load has populated the form
    expect(await screen.findByDisplayValue("Анна")).toBe(screen.getByLabelText("Имя"));
    expect(screen.getByLabelText("Фамилия")).toHaveValue("Иванова");
    expect(screen.getByLabelText("Телефон")).toHaveValue("+7 900 000 00 00");
    const email = screen.getByLabelText("Email");
    expect(email).toHaveValue("anna@example.com");
    expect(email).toBeDisabled();
  });

  it("submits the edited fields to PATCH /v1/me", async () => {
    apiMock.patch.mockResolvedValue({ ...me, first_name: "Аня", name: "Аня Иванова" });
    renderDialog();

    const first = await screen.findByDisplayValue("Анна");
    await userEvent.clear(first);
    await userEvent.type(first, "Аня");
    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith("/v1/me", {
        first_name: "Аня",
        last_name: "Иванова",
        phone: "+7 900 000 00 00",
      }),
    );
  });
});
