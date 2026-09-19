import { Link, Outlet, useParams } from "react-router-dom";

import { ProfileMenu } from "@/pages/dashboard/ProfileMenu";
import { SpaceSwitcher } from "@/pages/dashboard/SpaceSwitcher";

/** App shell: header (brand + space switcher + profile) and routed content. */
export default function App() {
  const { spaceId } = useParams();
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="bg-primary text-primary-foreground sticky top-0 z-10 shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset,0_8px_20px_-12px_rgba(15,26,17,0.5)]">
        <nav className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="font-serif flex shrink-0 items-center gap-1.5 text-lg font-semibold whitespace-nowrap italic"
            >
              <span aria-hidden className="not-italic">
                🌿
              </span>
              <span className="hidden sm:inline">Журнал расходов</span>
            </Link>
            <SpaceSwitcher activeSpaceId={spaceId} />
          </div>
          <ProfileMenu />
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
