import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "@/App";
import { RequireAuth } from "@/shared/auth/RequireAuth";
import { LoginPage } from "@/pages/LoginPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { SpacesPage } from "@/pages/SpacesPage";
import { ExpensesPage } from "@/pages/ExpensesPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <App />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/spaces" replace /> },
      { path: "spaces", element: <SpacesPage /> },
      { path: "spaces/:spaceId/expenses", element: <ExpensesPage /> },
    ],
  },
]);
