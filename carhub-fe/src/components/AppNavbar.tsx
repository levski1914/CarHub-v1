"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { auth, notificationsApi } from "@/lib/api";

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
  const [me, setMe] = useState<{ emailVerified?: boolean } | null>(null);
  const [ns, setNs] = useState<{
    emailEnabled: boolean;
    smsEnabled: boolean;
  } | null>(null);

  useEffect(() => {
    auth
      .me()
      .then(setMe)
      .catch(() => {});
    notificationsApi
      .get()
      .then(setNs)
      .catch(() => {});
  }, []);

  const needsAttention =
    (ns?.emailEnabled && !me?.emailVerified) ||
    (!ns?.emailEnabled && !ns?.smsEnabled);
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
        <Link href="/" className="flex items-center shrink-0">
          <span className="h-10 w-[180px] overflow-hidden flex items-center">
            <img
              src="/logo.png"
              alt="CarHub"
              className="max-h-10 max-w-[180px] object-contain block"
            />
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          <NavLink href="/vehicles" label="Автомобили" />

          <NavLink href="/settings" label="Настройки" />
          <NavLink href="/profile" label="Профил" />
          {needsAttention && (
            <span className="ml-1 inline-block h-2 w-2 rounded-full bg-red-500" />
          )}
        </nav>

        <Button variant="outline" size="sm" onClick={logout}>
          Изход
        </Button>
      </div>
    </header>
  );
}
