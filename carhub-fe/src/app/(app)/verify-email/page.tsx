"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token");

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMsg("Липсва token.");
      return;
    }

    auth
      .verifyEmail(token)
      .then(() => setStatus("ok"))
      .catch((e: any) => {
        setStatus("error");
        setMsg(e.message ?? "Невалиден или изтекъл линк.");
      });
  }, [token]);

  return (
    <div className="max-w-lg mx-auto p-4">
      <Card className="bg-background/70 backdrop-blur">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Потвърждение на имейл</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {status === "loading" && <div>Проверяваме…</div>}

          {status === "ok" && (
            <>
              <div className="font-medium">Готово ✅</div>
              <div className="text-muted-foreground">
                Имейлът ти е потвърден.
              </div>
              <Button onClick={() => router.push("/profile")}>
                Към профил
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="font-medium text-red-600">Грешка</div>
              <div className="text-muted-foreground">{msg}</div>
              <Button variant="outline" onClick={() => router.push("/profile")}>
                Към профил
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
