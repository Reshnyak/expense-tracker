import { Navigate, useParams } from "react-router-dom";

import { getLastSpaceId } from "@/shared/lib/lastSpace";

/** `/` — jump straight to the last opened space, else let SpacesPage decide. */
export function HomeRedirect() {
  const last = getLastSpaceId();
  return <Navigate to={last ? `/spaces/${last}` : "/spaces"} replace />;
}

/** Old bookmark `/spaces/:id/expenses` now folds into the dashboard. */
export function LegacyExpensesRedirect() {
  const { spaceId } = useParams();
  return <Navigate to={`/spaces/${spaceId}`} replace />;
}
