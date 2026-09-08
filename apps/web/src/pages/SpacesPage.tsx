import { Link } from "react-router-dom";

import { useSpaces } from "@/features/spaces/useSpaces";
import { useAuth } from "@/shared/auth/AuthContext";

export function SpacesPage() {
  const { user, logout } = useAuth();
  const { data: spaces, isLoading, error } = useSpaces();

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your spaces</h2>
        <div className="text-sm text-gray-500">
          {user?.email}
          <button onClick={logout} className="ml-3 text-blue-600 hover:underline">
            Sign out
          </button>
        </div>
      </div>

      {isLoading && <p className="mt-4 text-gray-500">Loading…</p>}
      {error && <p className="mt-4 text-red-600">Failed to load spaces.</p>}

      <ul className="mt-4 divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
        {spaces?.map((s) => (
          <li key={s.id} className="px-4 py-3">
            <Link to={`/spaces/${s.id}/expenses`} className="text-blue-600 hover:underline">
              {s.name}
            </Link>
            <span className="ml-2 text-xs text-gray-400">{s.currency}</span>
          </li>
        ))}
        {spaces?.length === 0 && (
          <li className="px-4 py-3 text-gray-500">No spaces yet.</li>
        )}
      </ul>
    </section>
  );
}
