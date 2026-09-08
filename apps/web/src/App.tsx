import { Link, Outlet, useLocation } from "react-router-dom";

/** App shell: header + routed content. */
export default function App() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
          <Link to="/" className="font-semibold">
            Журнал расходов
          </Link>
          <Link
            to="/spaces"
            className={pathname.startsWith("/spaces") ? "text-blue-600" : "text-gray-500"}
          >
            Пространства
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
