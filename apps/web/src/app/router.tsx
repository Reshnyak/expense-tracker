import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "@/App";
import { RequireAuth } from "@/shared/auth/RequireAuth";
import { LoginPage } from "@/pages/LoginPage";
import { SpacesPage } from "@/pages/SpacesPage";
import { ExpensesPage } from "@/pages/ExpensesPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
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
