"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

type UpcomingItem = {
  vehicleId: string;
  plate: string;
  label: string;
  dueDate: string; // ISO
  days: number;
  status: "overdue" | "soon" | "ok";
};

function labelBg(type: any) {
  // ако от BE идва enum GO/GTP/VIGNETTE/TAX
  if (type === "GO") return "ГО";
  if (type === "GTP") return "ГТП";
  if (type === "VIGNETTE") return "Винетка";
  if (type === "TAX") return "Данък";
  return String(type);
}

function daysUntil(iso: string) {
  const due = new Date(iso);
  const today = new Date();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((b - a) / 86400000);
}

export default function LeftSidebar() {
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let timer: any;

    async function load() {
      try {
        const vehicles = await api.listVehicles();

        const all: UpcomingItem[] = [];
        for (const v of vehicles) {
          const obs = await api.listObligations(v.id);

          for (const o of obs as any[]) {
            const days = daysUntil(o.dueDate);
            const status = days < 0 ? "overdue" : days <= 7 ? "soon" : "ok";
            all.push({
              vehicleId: v.id,
              plate: v.plate,
              label: labelBg(o.type),
              dueDate: o.dueDate,
              days,
              status,
            });
          }
        }

        all.sort((a, b) => a.days - b.days);

        if (alive) setItems(all.slice(0, 8));
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    async function loop() {
      setLoading(true);
      await load();

      // 30s refresh
      timer = setTimeout(loop, 30_000);
    }

    loop();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const empty = !loading && items.length === 0;

  return (
    <Card className="bg-background/70 backdrop-blur">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Предстоящи срокове
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        {loading && <div className="text-muted-foreground">Зареждане…</div>}

        {empty && (
          <div className="text-muted-foreground">
            Няма задължения. Добави срокове към автомобилите си.
          </div>
        )}

        {!loading &&
          items.map((x) => (
            <div
              key={`${x.vehicleId}-${x.label}-${x.dueDate}`}
              className="flex items-start justify-between gap-2 rounded-lg border bg-background/60 p-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{x.plate}</span>
                  <Badge variant="outline" className="shrink-0">
                    {x.label}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(x.dueDate).toLocaleDateString("bg-BG")}
                </div>
              </div>

              <Badge
                variant={
                  x.status === "overdue"
                    ? "destructive"
                    : x.status === "soon"
                      ? "secondary"
                      : "outline"
                }
                className="shrink-0"
              >
                {x.days < 0 ? `-${Math.abs(x.days)}д` : `${x.days}д`}
              </Badge>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
