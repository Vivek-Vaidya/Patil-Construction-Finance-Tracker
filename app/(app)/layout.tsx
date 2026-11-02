import { requireAuth } from "@/lib/auth-utils";
import { Sidebar } from "./_components/Sidebar";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        userName={session.user.name ?? "User"}
        userRole={session.user.role ?? "VIEWER"}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Page content with top padding on mobile for topbar */}
        <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Mobile FAB — Add Expense */}
      <Link
        href="/transactions/new"
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 shadow-lg flex items-center justify-center transition-colors"
        aria-label="Add Expense"
      >
        <PlusCircle className="w-7 h-7 text-white" />
      </Link>
    </div>
  );
}
