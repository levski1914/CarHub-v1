"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/api";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        await auth.me();
        if (mounted) setLoading(false);
      } catch {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    }

    check();

    return () => {
      mounted = false;
    };
  }, [router, pathname]);

  if (loading) {
    return <div className="p-6">Зареждане...</div>;
  }

  return <>{children}</>;
}
