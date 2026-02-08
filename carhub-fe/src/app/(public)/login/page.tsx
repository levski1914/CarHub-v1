"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function doLogin() {
    setErr("");
    setLoading(true);
    try {
      await auth.login(email.trim().toLowerCase(), password);
      r.push("/vehicles");
    } catch (e: any) {
      setErr(e.message ?? "Грешка");
    } finally {
      setLoading(false);
    }
  }

  async function doRegister() {
    setErr("");
    setLoading(true);
    try {
      await auth.register(email.trim().toLowerCase(), password);
      // auto-login след регистрация
      await doLogin();
    } catch (e: any) {
      setErr(e.message ?? "Грешка");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-background/70 backdrop-blur border shadow-sm">
        <CardHeader>
          <CardTitle>CarHub</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {err && <p className="text-sm text-red-600">{err}</p>}

          <div className="space-y-2">
            <Label htmlFor="email">Имейл</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Парола</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="pt-4">
              <Button className="w-full" disabled={loading} onClick={doLogin}>
                {loading ? "..." : "Влез"}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="pt-4">
              <Button
                className="w-full"
                disabled={loading}
                onClick={doRegister}
              >
                {loading ? "..." : "Създай акаунт"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
