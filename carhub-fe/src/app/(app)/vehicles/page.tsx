"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, Obligation, Vehicle } from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, Pencil, Trash2, ExternalLink } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Row = {
  vehicle: Vehicle;
  byType: Partial<Record<Obligation["type"], Obligation[]>>;
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function typeLabel(t: Obligation["type"]) {
  if (t === "Гражданска отговорност") return "ГО";
  if (t === "Технически преглед") return "ГТП";
  if (t === "TAX") return "Данък";
  return "Винетка";
}

function pickDisplay(list?: Obligation[]) {
  if (!list || list.length === 0) return "—";
  const sorted = [...list].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return fmtDate(sorted[0].dueDate);
}

function statusVariant(s?: "ok" | "soon" | "overdue") {
  if (!s) return "secondary";
  return s === "ok" ? "secondary" : s === "soon" ? "default" : "destructive";
}

function statusText(s: Vehicle["status"]) {
  return s === "ok" ? "OK" : s === "soon" ? "Предстои" : "Просрочено";
}

function statusEmoji(s: Vehicle["status"]) {
  return s === "ok" ? "✅" : s === "soon" ? "⏳" : "⚠️";
}

function rowTint(s: Vehicle["status"]) {
  return s === "overdue"
    ? "bg-red-500/5"
    : s === "soon"
      ? "bg-amber-500/5"
      : "";
}

function normalizePlate(s: string) {
  return s.replace(/\s+/g, "").toUpperCase();
}

export default function VehiclesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPlate, setEditPlate] = useState("");
  const [editMake, setEditMake] = useState("");
  const [editModel, setEditModel] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const vehicles = await api.listVehicles();

      const withObligations = await Promise.all(
        vehicles.map(async (v) => {
          const obs = await api
            .listObligations(v.id)
            .catch(() => [] as Obligation[]);

          const byType: Row["byType"] = {};
          for (const o of obs) {
            if (!byType[o.type]) byType[o.type] = [];
            byType[o.type]!.push(o);
          }

          return { vehicle: v, byType };
        }),
      );

      setRows(withObligations);
    } catch (e: any) {
      setErr(e?.message ?? "Грешка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    const prio = (s: Vehicle["status"]) =>
      s === "overdue" ? 0 : s === "soon" ? 1 : 2;
    return [...rows].sort(
      (a, b) => prio(a.vehicle.status) - prio(b.vehicle.status),
    );
  }, [rows]);

  const counts = useMemo(() => {
    const c = { overdue: 0, soon: 0, ok: 0 };
    for (const r of rows) c[r.vehicle.status]++;
    return c;
  }, [rows]);

  const nextDue = useMemo(() => {
    let best: { plate: string; type: Obligation["type"]; date: string } | null =
      null;

    for (const r of rows) {
      const all = Object.values(r.byType)
        .flat()
        .filter(Boolean) as Obligation[];
      for (const o of all) {
        if (!best || o.dueDate < best.date) {
          best = { plate: r.vehicle.plate, type: o.type, date: o.dueDate };
        }
      }
    }
    return best;
  }, [rows]);

  function openEdit(v: Vehicle) {
    setErr("");
    setEditId(v.id);
    setEditPlate(v.plate ?? "");
    setEditMake(v.make ?? "");
    setEditModel(v.model ?? "");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editId) return;
    setErr("");
    setSaving(true);
    try {
      await api.updateVehicle(editId, {
        plate: normalizePlate(editPlate),
        make: editMake.trim(),
        model: editModel.trim(),
      });
      setEditOpen(false);
      setEditId(null);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Грешка");
    } finally {
      setSaving(false);
    }
  }

  async function deleteVehicle(v: Vehicle) {
    const ok = confirm(
      `Сигурен ли си, че искаш да изтриеш ${v.plate}? Това ще изтрие и данните към нея.`,
    );
    if (!ok) return;

    setErr("");
    try {
      await api.deleteVehicle(v.id);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Грешка");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Автомобили</h1>
            <p className="text-sm text-muted-foreground">
              Всичко важно на едно място — винетки, ГТП, ГО и напомняния.
            </p>
          </div>

          <Button asChild>
            <Link href="/vehicles/new">+ Добави</Link>
          </Button>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="rounded-xl border bg-background/60 backdrop-blur overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-background/40">
                <TableHead>Кола</TableHead>
                <TableHead>Винетка</TableHead>
                <TableHead>Технически преглед</TableHead>
                <TableHead>Гражданска отговорност</TableHead>
                <TableHead>Данък</TableHead>
                <TableHead>Кредит</TableHead>
                <TableHead className="text-right">Статус</TableHead>
                <TableHead className="text-right"> </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map((r) => {
                const v = r.vehicle;

                return (
                  <TableRow key={v.id} className={rowTint(v.status)}>
                    <TableCell className="font-medium">
                      <div>
                        {v.make} {v.model}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {v.plate}
                      </div>
                    </TableCell>

                    <TableCell>{pickDisplay(r.byType.VIGNETTE)}</TableCell>
                    <TableCell>{pickDisplay(r.byType.GTP)}</TableCell>
                    <TableCell>{pickDisplay(r.byType.GO)}</TableCell>
                    <TableCell>{pickDisplay(r.byType.TAX)}</TableCell>

                    <TableCell className="text-muted-foreground">—</TableCell>

                    <TableCell className="text-right">
                      <Badge variant={statusVariant(v.status) as any}>
                        {statusEmoji(v.status)} {statusText(v.status)}
                      </Badge>
                    </TableCell>

                    {/* ACTIONS */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Действия
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/vehicles/${v.id}`}
                              className="flex items-center"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Детайли
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => openEdit(v)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Редактирай
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => deleteVehicle(v)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Изтрий
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}

              {sorted.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-sm text-muted-foreground"
                  >
                    {loading ? "Зареждане..." : "Няма добавени автомобили."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="bg-background/70 backdrop-blur border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Просрочени</div>
                <div className="text-2xl font-semibold">{counts.overdue}</div>
              </div>
              <div className="text-2xl">⚠️</div>
            </CardContent>
          </Card>

          <Card className="bg-background/70 backdrop-blur border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  Предстоят (7 дни)
                </div>
                <div className="text-2xl font-semibold">{counts.soon}</div>
              </div>
              <div className="text-2xl">⏳</div>
            </CardContent>
          </Card>

          <Card className="bg-background/70 backdrop-blur border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Наред</div>
                <div className="text-2xl font-semibold">{counts.ok}</div>
              </div>
              <div className="text-2xl">✅</div>
            </CardContent>
          </Card>
        </div>

        {nextDue && (
          <div className="rounded-xl border bg-background/70 backdrop-blur shadow-sm p-3 text-sm">
            ✨ Най-близко: <b>{typeLabel(nextDue.type)}</b> за{" "}
            <b>{nextDue.plate}</b> до <b>{fmtDate(nextDue.date)}</b>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          * За MVP колоните показват най-близката предстояща дата за съответния
          тип.
        </p>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Редакция на автомобил</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">
                Рег. номер
              </label>
              <Input
                value={editPlate}
                onChange={(e) => setEditPlate(e.target.value)}
                placeholder="CB1234AB"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ще се запази като: <b>{normalizePlate(editPlate || "")}</b>
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Марка</label>
              <Input
                value={editMake}
                onChange={(e) => setEditMake(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Модел</label>
              <Input
                value={editModel}
                onChange={(e) => setEditModel(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Отказ
            </Button>
            <Button onClick={saveEdit} disabled={saving || !editPlate.trim()}>
              {saving ? "Запазваме..." : "Запази"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
