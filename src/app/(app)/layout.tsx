import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { LanguageProvider } from "@/lib/i18n";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRole = session.user.role ?? "BARTENDER";
  const userName = session.user.name ?? "User";

  return (
    <LanguageProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole={userRole} userName={userName} />
        <div className="flex-1 flex flex-col">
          <MobileNav userRole={userRole} userName={userName} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </LanguageProvider>
  );
}
