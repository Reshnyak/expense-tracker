import { createBrowserRouter } from "react-router-dom";

import App from "@/App";
import { RedirectIfAuthed } from "@/shared/auth/RedirectIfAuthed";
import { RequireAuth } from "@/shared/auth/RequireAuth";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { SpacesPage } from "@/pages/SpacesPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { HomeRedirect, LegacyExpensesRedirect } from "@/app/redirects";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <RedirectIfAuthed>
        <LoginPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/register",
    element: (
      <RedirectIfAuthed>
        <RegisterPage />
      </RedirectIfAuthed>
    ),
  },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <App />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: "spaces", element: <SpacesPage /> },
      { path: "spaces/:spaceId", element: <DashboardPage /> },
      { path: "spaces/:spaceId/expenses", element: <LegacyExpensesRedirect /> },
    ],
  },
]);
