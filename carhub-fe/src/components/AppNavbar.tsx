"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const NavLink = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname();
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`text-sm hover:text-foreground ${
        active ? "text-foreground font-medium" : "text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );
};

export default function AppNavbar() {
  const router = useRouter();

  async function logout() {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.warn("Logout failed", e);
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur">
      <div className="max-w-6xl mx-auto h-14 flex items-center justify-between px-4">
        <Link href="/vehicles" className="flex items-center gap-2">
          <img src="/logo.png" style={{ width: "200px" }} alt="CarHub" />
        </Link>

        <nav className="flex items-center gap-4">
          <NavLink href="/vehicles" label="Автомобили" />
          <NavLink href="/calendar" label="Календар" />
          <NavLink href="/settings" label="Настройки" />
          <NavLink href="/profile" label="Профил" />
        </nav>

        <Button variant="outline" size="sm" onClick={logout}>
          Изход
        </Button>
      </div>
    </header>
  );
}
