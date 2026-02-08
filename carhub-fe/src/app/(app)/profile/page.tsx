"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Car,
  FileText,
  Trash2,
  RefreshCw,
  Bell,
  Settings,
  Search,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  api,
  historyApi,
  auth,
  notificationsApi,
  NotificationSettings,
} from "@/lib/api";

// 👉 ако ще го вържеш към BE:
// import { historyApi, HistoryEvent, HistoryKind } from "@/lib/api";

// Ако още няма BE endpoint – ползвай mock:
export type HistoryKind =
  | "doc_uploaded"
  | "doc_deleted"
  | "obligation_updated"
  | "enrich_checked"
  | "vehicle_created"
  | "vehicle_updated"
  | "vehicle_deleted"
  | "notification_sent"
  | "email_verify_sent"
  | "email_verified";

export type HistoryEvent = {
  id: string;
  userId: string;
  vehicleId?: string | null;

  kind: HistoryKind;
  title: string;
  description?: string | null;

  documentId?: string | null;
  documentName?: string | null;
  obligationType?: "GO" | "GTP" | "VIGNETTE" | "TAX" | null;

  createdAt: string; // ISO
};

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("bg-BG");
  } catch {
    return iso;
  }
}
function fmtDayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  if (sameDay) return "Днес";
  if (isYesterday) return "Вчера";
  return d.toLocaleDateString("bg-BG");
}

const FILTERS: Array<{ key: "all" | HistoryKind; label: string }> = [
  { key: "all", label: "Всичко" },
  { key: "doc_uploaded", label: "Документи" },
  { key: "obligation_updated", label: "Задължения" },
  { key: "enrich_checked", label: "Проверки" },
  { key: "doc_deleted", label: "Изтривания" },
  { key: "notification_sent", label: "Известия" },
];

function kindMeta(kind: HistoryKind) {
  switch (kind) {
    case "doc_uploaded":
      return { icon: FileText, badge: "secondary" as const, label: "Документ" };
    case "doc_deleted":
      return { icon: Trash2, badge: "destructive" as const, label: "Изтрито" };
    case "obligation_updated":
      return { icon: Settings, badge: "default" as const, label: "Задължение" };
    case "enrich_checked":
      return {
        icon: RefreshCw,
        badge: "secondary" as const,
        label: "Проверка",
      };
    case "notification_sent":
      return { icon: Bell, badge: "secondary" as const, label: "Известие" };
    case "vehicle_created":
      return { icon: Car, badge: "secondary" as const, label: "Автомобил" };
    case "vehicle_updated":
      return { icon: Car, badge: "secondary" as const, label: "Автомобил" };
    case "vehicle_deleted":
      return {
        icon: Trash2,
        badge: "destructive" as const,
        label: "Автомобил",
      };
    default:
      return { icon: Settings, badge: "secondary" as const, label: kind };
  }
}

// MOCK (махаш го, когато вържеш към BE)
const MOCK: HistoryEvent[] = [
  {
    id: "1",
    userId: "u",
    vehicleId: "v1",
    kind: "doc_uploaded",
    title: "Качен документ",
    description: "ГО · към ГО до 09.12.2026",
    documentName: "go_2026.pdf",
    obligationType: "GO",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    userId: "u",
    vehicleId: "v1",
    kind: "enrich_checked",
    title: "Авто проверка",
    description: "Винетка валидна до 12.02.2026",
    obligationType: "VIGNETTE",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    userId: "u",
    vehicleId: "v1",
    kind: "doc_deleted",
    title: "Изтрит документ",
    description: "old_scan.jpg",
    documentName: "old_scan.jpg",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"profile" | "history">("history");

  // vehicles
  const [vehicles, setVehicles] = useState<
    Array<{ id: string; plate: string; make: string; model: string }>
  >([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("all");

  // history
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [filter, setFilter] = useState<"all" | HistoryKind>("all");
  const [q, setQ] = useState("");

  const [me, setMe] = useState<{
    userId: string;
    email?: string;
    emailVerified?: boolean;
  } | null>(null);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [ns, setNs] = useState<NotificationSettings | null>(null);
  const [savingNs, setSavingNs] = useState(false);

  useEffect(() => {
    notificationsApi
      .get()
      .then(setNs)
      .catch(() => {});
  }, []);
  useEffect(() => {
    auth
      .me()
      .then(setMe)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setErr("");
    setLoading(true);

    historyApi
      .list({
        vehicleId: selectedVehicleId === "all" ? undefined : selectedVehicleId,
        kind: filter === "all" ? undefined : filter,
        q: q.trim() ? q.trim() : undefined,
      })
      .then(setEvents)
      .catch((e) => setErr(e.message ?? "Грешка"))
      .finally(() => setLoading(false));
  }, [selectedVehicleId, filter, q]);

  useEffect(() => {
    api
      .listVehicles()
      .then((v) => setVehicles(v))
      .catch(() => {});
  }, []);

  // useEffect(() => {
  //   // Когато вържеш към BE:
  //   // setLoading(true);
  //   // historyApi
  //   //   .list({
  //   //     vehicleId: selectedVehicleId === "all" ? undefined : selectedVehicleId,
  //   //   })
  //   //   .then(setEvents)
  //   //   .catch((e) => setErr(e.message ?? "Грешка"))
  //   //   .finally(() => setLoading(false));

  //   // Засега mock:
  //   setErr("");
  //   setLoading(true);
  //   setTimeout(() => {
  //     setEvents(MOCK);
  //     setLoading(false);
  //   }, 200);
  // }, [selectedVehicleId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return events
      .filter((e) =>
        selectedVehicleId === "all" ? true : e.vehicleId === selectedVehicleId,
      )
      .filter((e) => (filter === "all" ? true : e.kind === filter))
      .filter((e) => {
        if (!needle) return true;
        const hay = `${e.title} ${e.description ?? ""} ${
          e.documentName ?? ""
        }`.toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [events, selectedVehicleId, filter, q]);

  const grouped = useMemo(() => {
    const out: Record<string, HistoryEvent[]> = {};
    for (const e of filtered) {
      const key = fmtDayLabel(e.createdAt);
      if (!out[key]) out[key] = [];
      out[key].push(e);
    }
    return out;
  }, [filtered]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as any)}
        className="space-y-3"
      >
        <TabsList className="bg-background/70 backdrop-blur border">
          <TabsTrigger value="profile">Профил</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-3">
          <Card className="bg-background/70 backdrop-blur">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Профил</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-muted-foreground">Имейл</div>
                  <div className="font-medium">{me?.email ?? "—"}</div>
                </div>

                <Badge
                  variant={me?.emailVerified ? "secondary" : "destructive"}
                >
                  {me?.emailVerified ? "Потвърден" : "Непотвърден"}
                </Badge>
              </div>

              {!me?.emailVerified && (
                <div className="rounded-lg border p-3 text-sm">
                  <div className="font-medium">Потвърди имейла си</div>
                  <div className="text-muted-foreground mt-1">
                    Нужно е, за да получаваш известия и да възстановяваш акаунта
                    си.
                  </div>

                  <div className="mt-3">
                    <Button
                      disabled={sendingVerify}
                      onClick={async () => {
                        try {
                          setSendingVerify(true);
                          await auth.resendVerifyEmail();
                          alert("Изпратихме ти линк за потвърждение.");
                        } catch (e: any) {
                          alert(e.message ?? "Грешка");
                        } finally {
                          setSendingVerify(false);
                        }
                      }}
                    >
                      {sendingVerify ? "Изпращаме..." : "Изпрати линк"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-background/70 backdrop-blur">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Известия</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
              {!ns ? (
                <div className="text-muted-foreground">Зареждане…</div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">Email известия</div>
                      <div className="text-muted-foreground text-xs">
                        Напомняния за ГО / ГТП / Винетка / Данък
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={ns.emailEnabled}
                      onChange={(e) =>
                        setNs({ ...ns, emailEnabled: e.target.checked })
                      }
                    />
                  </div>

                  {!me?.emailVerified && ns.emailEnabled && (
                    <div className="rounded-lg border p-3 text-xs">
                      <div className="font-medium">Имейлът не е потвърден</div>
                      <div className="text-muted-foreground mt-1">
                        Няма да изпращаме имейл известия, докато не го
                        потвърдиш.
                      </div>
                      <div className="mt-2">
                        <Button
                          size="sm"
                          disabled={sendingVerify}
                          onClick={async () => {
                            try {
                              setSendingVerify(true);
                              await auth.resendVerifyEmail();
                              alert("Изпратихме ти линк за потвърждение.");
                            } finally {
                              setSendingVerify(false);
                            }
                          }}
                        >
                          Изпрати линк
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="font-medium">Напомняй ми:</div>
                    <div className="flex flex-wrap gap-2">
                      {[1, 3, 7, 30].map((d) => {
                        const checked = ns.daysBefore?.includes(d);
                        return (
                          <label
                            key={d}
                            className="flex items-center gap-2 text-xs border rounded-md px-3 py-2 bg-background"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? Array.from(
                                      new Set([...(ns.daysBefore || []), d]),
                                    )
                                  : (ns.daysBefore || []).filter(
                                      (x) => x !== d,
                                    );
                                setNs({
                                  ...ns,
                                  daysBefore: next.sort((a, b) => a - b),
                                });
                              }}
                            />
                            {d} ден{d === 1 ? "" : "а"} преди
                          </label>
                        );
                      })}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Ако ги изключиш, няма да получаваш напомняния и можеш да
                      пропуснеш срок.
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      disabled={savingNs}
                      onClick={async () => {
                        try {
                          setSavingNs(true);
                          const saved = await notificationsApi.update({
                            emailEnabled: ns.emailEnabled,
                            smsEnabled: ns.smsEnabled,
                            email: me?.email,
                            daysBefore: ns.daysBefore,
                          });
                          setNs(saved);
                          alert("Запазено ✅");
                        } catch (e: any) {
                          alert(e.message ?? "Грешка");
                        } finally {
                          setSavingNs(false);
                        }
                      }}
                    >
                      {savingNs ? "Запис..." : "Запази"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => notificationsApi.get().then(setNs)}
                    >
                      Отмени
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {err && (
            <div className="rounded-lg border bg-background/70 backdrop-blur p-3 text-sm text-red-600">
              {err}
            </div>
          )}

          <Card className="bg-background/70 backdrop-blur">
            <CardHeader className="py-3">
              <CardTitle className="text-base">История</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* Vehicle select */}
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-background"
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                >
                  <option value="all">Всички автомобили</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} · {v.make} {v.model}
                    </option>
                  ))}
                </select>

                {/* Filter */}
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-background"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                >
                  {FILTERS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>

                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Търси (документ, тип, бележка...)"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-6">
                {loading && (
                  <div className="text-sm text-muted-foreground">
                    Зареждане…
                  </div>
                )}

                {!loading && filtered.length === 0 && (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    Няма записи по тези филтри. Качи документ или направи
                    авто-проверка, за да се появи история.
                  </div>
                )}

                {!loading &&
                  Object.entries(grouped).map(([day, items]) => (
                    <div key={day} className="space-y-2">
                      <div className="text-sm font-semibold">{day}</div>

                      <div className="relative pl-6 space-y-3">
                        {/* vertical line */}
                        <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />

                        {items.map((e) => {
                          const meta = kindMeta(e.kind);
                          const Icon = meta.icon;

                          return (
                            <div key={e.id} className="relative">
                              {/* dot */}
                              <div className="absolute left-1.5 top-4 w-2.5 h-2.5 rounded-full bg-background border" />

                              <div className="rounded-xl border bg-background/60 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Icon className="w-4 h-4 text-muted-foreground" />
                                      <div className="font-medium truncate">
                                        {e.title}
                                      </div>
                                      <Badge
                                        variant={meta.badge as any}
                                        className="shrink-0"
                                      >
                                        {meta.label}
                                      </Badge>
                                      {e.obligationType && (
                                        <Badge
                                          variant="outline"
                                          className="shrink-0"
                                        >
                                          {e.obligationType}
                                        </Badge>
                                      )}
                                    </div>

                                    {e.description && (
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        {e.description}
                                      </div>
                                    )}

                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {/* Useful links (примерни) */}
                                      {e.vehicleId && (
                                        <Link
                                          className="text-xs underline text-muted-foreground hover:text-foreground"
                                          href={`/vehicles/${e.vehicleId}`}
                                        >
                                          Отвори автомобила
                                        </Link>
                                      )}

                                      {e.documentId && (
                                        <span className="text-xs text-muted-foreground">
                                          (тук можеш да сложиш: “Отвори
                                          документа”)
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-xs text-muted-foreground shrink-0">
                                    {fmtDateTime(e.createdAt)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>

              {/* footer hint */}
              <div className="text-xs text-muted-foreground">
                Съвет: запиши история за качване/изтриване на документи, промени
                по задължения и авто-проверки. Така потребителят винаги “вижда
                какво се случва”.
              </div>
            </CardContent>
          </Card>

          {/* Optional: quick buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFilter("doc_uploaded")}>
              Само документи
            </Button>
            <Button
              variant="outline"
              onClick={() => setFilter("enrich_checked")}
            >
              Само проверки
            </Button>
            <Button variant="outline" onClick={() => setFilter("all")}>
              Всичко
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
