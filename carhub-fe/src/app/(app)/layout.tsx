import AppNavbar from "@/components/AppNavbar";
import LeftSidebar from "@/components/Shell/LeftSidebar";
import RightSidebar from "@/components/Shell/RightSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppNavbar />
      <div className="max-w-10xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4 items-start">
          {/* LEFT */}
          <aside className="lg:sticky lg:top-20 space-y-4">
            <LeftSidebar />
          </aside>

          {/* MAIN */}
          <main className="min-w-0">{children}</main>

          {/* RIGHT */}
          <aside className="lg:sticky lg:top-20 space-y-4">
            <RightSidebar />
          </aside>
        </div>
      </div>
    </div>
  );
}
