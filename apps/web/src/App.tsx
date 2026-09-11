import { Link, Outlet, useParams } from "react-router-dom";

import { ProfileMenu } from "@/pages/dashboard/ProfileMenu";
import { SpaceSwitcher } from "@/pages/dashboard/SpaceSwitcher";

/** App shell: header (brand + space switcher + profile) and routed content. */
export default function App() {
  const { spaceId } = useParams();
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="bg-background sticky top-0 z-10 border-b">
        <nav className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-semibold whitespace-nowrap">
              Журнал расходов
            </Link>
            <SpaceSwitcher activeSpaceId={spaceId} />
          </div>
          <ProfileMenu />
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
