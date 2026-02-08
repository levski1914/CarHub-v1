"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  api,
  Obligation,
  Vehicle,
  EnrichResponse,
  EnrichCheck,
  EnrichResult,
  docsApi,
  DocumentRow,
  integrations,
} from "@/lib/api";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRef } from "react";
import { HelpTip } from "@/components/ui/HelpTip";
/** ✅ ВАЖНО: типовете за картите трябва да са enum ключове, не български стрингове */
const SUMMARY_TYPES = ["GO", "GTP", "VIGNETTE", "TAX"] as const;
type SummaryType = (typeof SUMMARY_TYPES)[number];
const DOC_CATEGORIES = [
  "GO",
  "GTP",
  "VIGNETTE",
  "TAX",
  "SERVICE",
  "CREDIT",
  "OTHER",
] as const;
const obligationTypeForDoc: Partial<Record<DocCategory, SummaryType>> = {
  GO: "GO",
  GTP: "GTP",
  VIGNETTE: "VIGNETTE",
  TAX: "TAX",
};
const DOC_TO_OBLIGATION: Partial<Record<DocCategory, Obligation["type"]>> = {
  GO: "GO",
  GTP: "GTP",
  VIGNETTE: "VIGNETTE",
  TAX: "TAX",
};

type DocCategory = (typeof DOC_CATEGORIES)[number];

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("bg-BG");
  } catch {
    return "—";
  }
}

function obligationShort(t: SummaryType | Obligation["type"]) {
  // поддържаме и двата случая (ако някъде още идва на български)
  if (t === "GO" || t === ("Гражданска отговорност" as any)) return "ГО";
  if (t === "GTP" || t === ("Технически преглед" as any)) return "ГТП";
  if (t === "TAX") return "Данък";
  if (t === "VIGNETTE" || t === ("Винетка" as any)) return "Винетка";
  return String(t);
}

function obligationStatusText(s?: "ok" | "soon" | "overdue") {
  if (!s) return "";
  return s === "ok" ? "OK" : s === "soon" ? "Предстои" : "Просрочено";
}

function enrichStatusLabel(r: EnrichResult) {
  if (r.status === "cached") return "Проверено";
  if (r.status === "ok") return "OK";
  if (r.status === "needs_user") return "Потвърди";
  if (r.status === "failed") return "Грешка";
  return r.status;
}

function enrichCheckLabel(c: EnrichCheck) {
  if (c === "Винетка") return "Винетка";
  if (c === "Гражданска отговорност") return "Гражданска отговорност";
  if (c === "Технически преглед") return "Технически преглед";
  return c;
}

function statusBadgeVariant(s?: "ok" | "soon" | "overdue") {
  if (!s) return "secondary";
  return s === "ok" ? "secondary" : s === "soon" ? "default" : "destructive";
}

function normalizePlate(s: string) {
  return (s || "").replace(/\s+/g, "").toUpperCase();
}

export default function VehicleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [err, setErr] = useState("");
  const [docCategory, setDocCategory] = useState<DocCategory>("GO");
  const [docObligationId, setDocObligationId] = useState<string | null>(null);

  const [enriching, setEnriching] = useState(false);
  const [enrichRes, setEnrichRes] = useState<EnrichResponse | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualType, setManualType] = useState<
    "GO" | "GTP" | "VIGNETTE" | "TAX"
  >("GO");
  const [manualDueDate, setManualDueDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [manualSaving, setManualSaving] = useState(false);
  const [docQuery, setDocQuery] = useState("");
  const [deleteDoc, setDeleteDoc] = useState<DocumentRow | null>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);

  // edit vehicle modal
  const [editOpen, setEditOpen] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [editPlate, setEditPlate] = useState("");
  const [editMake, setEditMake] = useState("");
  const [editModel, setEditModel] = useState("");

  // upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // captcha (GTP)
  const [gtpCaptchaOpen, setGtpCaptchaOpen] = useState(false);
  const [gtpCaptchaImg, setGtpCaptchaImg] = useState<string | null>(null);
  const [gtpChallengeId, setGtpChallengeId] = useState<string | null>(null);
  const [gtpCode, setGtpCode] = useState("");
  const [gtpSolving, setGtpSolving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setErr("");

    Promise.all([api.getVehicle(id), api.listObligations(id)])
      .then(([v, o]) => {
        setVehicle(v);
        setObligations(o);

        setEditPlate(v.plate);
        setEditMake(v.make);
        setEditModel(v.model);
      })
      .catch((e: any) => setErr(e.message ?? "Грешка"));

    docsApi
      .listByVehicle(id)
      .then(setDocs)
      .catch(() => {});
  }, [id]);
  useEffect(() => {
    setDocObligationId(null);
  }, [docCategory]);

  const obligationsSorted = useMemo(
    () => [...obligations].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [obligations],
  );
  const obligationsForDoc = useMemo(() => {
    const type = obligationTypeForDoc[docCategory];
    if (!type) return [];
    return obligationsSorted.filter((o) => o.type === type);
  }, [docCategory, obligationsSorted]);
  const obligationsForDocLink = useMemo(() => {
    const type = DOC_TO_OBLIGATION[docCategory];
    if (!type) return [];
    return obligationsSorted.filter((o) => o.type === type);
  }, [docCategory, obligationsSorted]);

  /**
   * ✅ Next due per type:
   * ключовете са GO/GTP/VIGNETTE/TAX
   */
  const nextByType = useMemo(() => {
    const map: Partial<Record<SummaryType, Obligation>> = {};
    for (const o of obligationsSorted) {
      const key = o.type as unknown as SummaryType;
      if (!map[key]) map[key] = o;
    }
    return map;
  }, [obligationsSorted]);

  async function enrich() {
    if (!vehicle) return;

    setErr("");
    setEnrichRes(null);
    setEnriching(true);

    try {
      const res = await api.enrichVehicle(id, {
        plate: vehicle.plate,
        checks: ["Винетка", "Гражданска отговорност", "Технически преглед"],
      });

      const gtp = res.results.find(
        (r) => r.check === "Технически преглед" && r.status === "needs_user",
      ) as any;

      if (gtp?.challengeId && gtp?.captchaImageBase64) {
        setGtpChallengeId(gtp.challengeId);
        setGtpCaptchaImg(gtp.captchaImageBase64);
        setGtpCaptchaOpen(true);
      }

      setEnrichRes(res);

      const updated = await api.listObligations(id);
      setObligations(updated);
    } catch (e: any) {
      setErr(e.message ?? "Грешка");
    } finally {
      setEnriching(false);
    }
  }
  function openManual(t: "GO" | "GTP" | "VIGNETTE" | "TAX") {
    setErr("");
    setManualType(t);
    setManualDueDate(new Date().toISOString().slice(0, 10));
    setManualOpen(true);
  }
  async function saveManual() {
    setErr("");
    setManualSaving(true);
    try {
      const iso = new Date(manualDueDate + "T12:00:00").toISOString();

      const updated = await api.upsertObligation(id, manualType, {
        dueDate: iso,
      });

      // локален update (по-бързо и clean)
      setObligations((prev) => {
        const rest = prev.filter((o) => o.type !== updated.type);
        return [...rest, updated];
      });

      setManualOpen(false);
    } catch (e: any) {
      setErr(e.message ?? "Грешка");
    } finally {
      setManualSaving(false);
    }
  }

  async function saveVehicle() {
    if (!vehicle) return;
    setErr("");
    setSavingVehicle(true);
    try {
      const updated = await api.updateVehicle(vehicle.id, {
        plate: normalizePlate(editPlate),
        make: editMake.trim(),
        model: editModel.trim(),
      });
      setVehicle(updated);
      setEditOpen(false);
    } catch (e: any) {
      setErr(e.message ?? "Грешка");
    } finally {
      setSavingVehicle(false);
    }
  }

  async function deleteVehicle() {
    if (!vehicle) return;
    const ok = confirm(
      `Сигурен ли си, че искаш да изтриеш ${vehicle.plate}? Това ще изтрие и данните към нея.`,
    );
    if (!ok) return;

    setErr("");
    try {
      await api.deleteVehicle(vehicle.id);
      router.push("/vehicles");
    } catch (e: any) {
      setErr(e.message ?? "Грешка");
    }
  }

  async function uploadDoc(file: File) {
    setErr("");
    setUploading(true);
    try {
      const created = await docsApi.upload({
        file,
        vehicleId: id,
        category: docCategory,
        obligationId: docObligationId ?? undefined,
      });

      setDocs((prev) => [created, ...prev]);
    } catch (e: any) {
      setErr(e.message ?? "Upload error");
    } finally {
      setUploading(false);
    }
  }

  async function confirmDeleteDoc(d: DocumentRow) {
    setErr("");
    setDeletingDoc(true);
    try {
      await docsApi.delete(d.id);
      setDocs((prev) => prev.filter((x) => x.id !== d.id));
      setDeleteDoc(null);
    } catch (e: any) {
      setErr(e.message ?? "Грешка при изтриване");
    } finally {
      setDeletingDoc(false);
    }
  }

  const filteredDocs = useMemo(() => {
    const q = docQuery.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => d.name.toLowerCase().includes(q));
  }, [docs, docQuery]);

  const docsByCategory = useMemo(() => {
    const map: Record<string, DocumentRow[]> = {};
    for (const d of filteredDocs) {
      const key = d.category || "OTHER";
      if (!map[key]) map[key] = [];
      map[key].push(d);
    }
    return map;
  }, [filteredDocs]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      {err && (
        <div className="rounded-lg border bg-background/70 backdrop-blur p-3 text-sm text-red-600">
          {err}
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl border bg-background/70 backdrop-blur p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Автомобил</div>
          <div className="text-xl font-semibold">
            {vehicle
              ? `${vehicle.make} ${vehicle.model} · ${vehicle.plate}`
              : "Зареждане..."}
          </div>
          {vehicle && (
            <div className="mt-2">
              <Badge variant={statusBadgeVariant(vehicle.status) as any}>
                {obligationStatusText(vehicle.status)}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button onClick={enrich} disabled={!vehicle || enriching}>
              {enriching ? "Проверяваме..." : "Автопопълни"}
            </Button>
            <HelpTip>
              Автопопълване прави проверка за ГО / ГТП / Винетка (може да поиска
              CAPTCHA).
            </HelpTip>
          </div>
          <Button
            variant="outline"
            onClick={() => setEditOpen(true)}
            disabled={!vehicle}
          >
            Редактирай
          </Button>
          <Button
            variant="destructive"
            onClick={deleteVehicle}
            disabled={!vehicle}
          >
            Изтрий
          </Button>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/profile?car=${id}#history`)}
      >
        История
      </Button>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-3">
        <TabsList className="bg-background/70 backdrop-blur border">
          <TabsTrigger value="summary">Обобщение</TabsTrigger>
          <TabsTrigger value="obligations">Задължения</TabsTrigger>
          <TabsTrigger value="docs">Документи</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary" className="space-y-3">
          {/* tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SUMMARY_TYPES.map((t) => {
              const o = nextByType[t];
              return (
                <Card key={t} className="bg-background/70 backdrop-blur">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">
                      {obligationShort(t)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openManual(t)}
                      >
                        + Ръчно
                      </Button>

                      {(t === "GO" || t === "GTP" || t === "VIGNETTE") && (
                        <Button size="sm" onClick={enrich} disabled={enriching}>
                          Авто
                        </Button>
                      )}
                    </div>

                    <div className="text-2xl font-semibold">
                      {o ? fmtDate(o.dueDate) : "—"}
                    </div>
                    <div className="mt-2">
                      {o ? (
                        <Badge variant={statusBadgeVariant(o.status) as any}>
                          {obligationStatusText(o.status)}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Няма данни
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Enrich results (compact) */}
          {enrichRes && (
            <Card className="bg-background/70 backdrop-blur">
              <CardHeader className="py-3">
                <CardTitle className="text-base">Последна проверка</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {enrichRes.results.map((r) => (
                  <div
                    key={r.check}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="font-medium">
                      {enrichCheckLabel(r.check)}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {enrichStatusLabel(r)}
                      </div>
                      {r.validUntil && (
                        <div className="text-xs text-muted-foreground">
                          до {fmtDate(r.validUntil)}
                        </div>
                      )}
                      {r.message && (
                        <div className="text-xs text-muted-foreground">
                          {r.message}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground">
                  * Автоматичните резултати може да не са 100% точни.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Obligations */}
        <TabsContent value="obligations" className="space-y-3">
          <Card className="bg-background/70 backdrop-blur">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Всички задължения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {obligationsSorted.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">{obligationShort(o.type)}</div>
                    <div className="text-xs text-muted-foreground">
                      Валидно до {fmtDate(o.dueDate)}
                    </div>
                  </div>
                  <Badge variant={statusBadgeVariant(o.status) as any}>
                    {obligationStatusText(o.status)}
                  </Badge>
                </div>
              ))}

              {obligationsSorted.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Няма въведени задължения.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground">
            (Следваща стъпка: бутон „Добави задължение“ като малък modal.)
          </div>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="docs" className="space-y-3">
          <Card className="bg-background/70 backdrop-blur">
            <CardHeader className="py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-base">Документи</CardTitle>

                <div className="w-full md:w-72">
                  <Input
                    value={docQuery}
                    onChange={(e) => setDocQuery(e.target.value)}
                    placeholder="Търси по име…"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Upload section */}
              <div className="rounded-xl border bg-background/40 p-3">
                <div className="text-sm font-semibold">Качи документ</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Избери категория, (по желание) връзка към конкретно задължение
                  и файл.
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                  {/* Category */}
                  <select
                    className="border rounded-md px-3 py-2 text-sm bg-background"
                    value={docCategory}
                    onChange={(e) =>
                      setDocCategory(e.target.value as DocCategory)
                    }
                  >
                    <option value="GO">ГО – Застраховка</option>
                    <option value="GTP">ГТП – Техн. преглед</option>
                    <option value="TAX">Данък</option>
                    <option value="VIGNETTE">Винетка</option>
                    <option value="SERVICE">Сервиз</option>
                    <option value="CREDIT">Кредит</option>
                    <option value="OTHER">Друго</option>
                  </select>

                  {/* Link to obligation (optional) */}
                  <div className="space-y-1">
                    <select
                      className="border rounded-md px-3 py-2 text-sm bg-background w-full"
                      value={docObligationId ?? ""}
                      onChange={(e) =>
                        setDocObligationId(e.target.value || null)
                      }
                    >
                      <option value="">Без връзка</option>

                      {obligationsForDocLink.map((o) => (
                        <option key={o.id} value={o.id}>
                          {obligationShort(o.type)} · до {fmtDate(o.dueDate)}
                        </option>
                      ))}
                    </select>

                    {!obligationsForDocLink.length && (
                      <div className="text-[11px] text-muted-foreground">
                        Няма намерено задължение от този тип за тази кола.
                      </div>
                    )}
                  </div>

                  {/* File */}
                  <div className="space-y-1">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      disabled={uploading}
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;

                        await uploadDoc(f);

                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    />
                    <div className="text-[11px] text-muted-foreground">
                      PDF или снимка. Макс размер според бекенда.
                    </div>
                  </div>
                </div>
              </div>

              {/* Files section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Файлове</div>
                  <div className="text-xs text-muted-foreground">
                    Общо: {filteredDocs.length}
                  </div>
                </div>

                {filteredDocs.length === 0 ? (
                  <div className="rounded-xl border bg-background/40 p-4 text-sm text-muted-foreground">
                    Няма качени документи.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(docsByCategory).map(([cat, items]) => (
                      <div key={cat} className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {obligationShort(cat as any)} · {items.length}
                        </div>

                        <div className="rounded-xl border bg-background/40 divide-y">
                          {items.map((d) => (
                            <div
                              key={d.id}
                              className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {d.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {fmtDate(d.createdAt)}
                                  {d.obligation && (
                                    <>
                                      {" "}
                                      · към {obligationShort(d.obligation.type)}
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Button asChild variant="outline" size="sm">
                                  <a
                                    href={docsApi.downloadUrl(d.id)}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Изтегли
                                  </a>
                                </Button>

                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDeleteDoc(d)}
                                >
                                  Изтрий
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delete confirm dialog */}
          <Dialog
            open={!!deleteDoc}
            onOpenChange={(o) => !o && setDeleteDoc(null)}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Изтриване на документ</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Сигурен ли си, че искаш да изтриеш{" "}
                  <span className="font-semibold text-foreground">
                    {deleteDoc?.name}
                  </span>
                  ?
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDoc(null)}
                    disabled={deletingDoc}
                  >
                    Отказ
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteDoc && confirmDeleteDoc(deleteDoc)}
                    disabled={!deleteDoc || deletingDoc}
                  >
                    {deletingDoc ? "Изтриваме..." : "Изтрий"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {nextByType[manualType] ? "Редакция" : "Задаване"}:
              {obligationShort(manualType)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Валидно до</div>
              <Input
                type="date"
                value={manualDueDate}
                onChange={(e) => setManualDueDate(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={saveManual}
              disabled={manualSaving}
            >
              {manualSaving ? "Записваме..." : "Запази"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit vehicle modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Редактирай автомобил</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Рег. номер</div>
              <Input
                value={editPlate}
                onChange={(e) => setEditPlate(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                Ще се запази като: <b>{normalizePlate(editPlate)}</b>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Марка</div>
              <Input
                value={editMake}
                onChange={(e) => setEditMake(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Модел</div>
              <Input
                value={editModel}
                onChange={(e) => setEditModel(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              disabled={savingVehicle}
              onClick={saveVehicle}
            >
              {savingVehicle ? "Записваме..." : "Запази"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* GTP CAPTCHA modal */}
      <Dialog open={gtpCaptchaOpen} onOpenChange={setGtpCaptchaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Потвърди проверката за ГТП</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Въведи кода за сигурност, за да завършим проверката.
            </p>

            {gtpCaptchaImg && (
              <div className="border rounded-md p-3 bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gtpCaptchaImg}
                  alt="CAPTCHA"
                  className="max-w-full h-auto"
                />
              </div>
            )}

            <Input
              value={gtpCode}
              onChange={(e) => setGtpCode(e.target.value)}
              placeholder="Код"
            />

            <Button
              disabled={
                !gtpChallengeId || gtpCode.trim().length < 3 || gtpSolving
              }
              onClick={async () => {
                try {
                  setGtpSolving(true);
                  const out = await integrations.gtpSolve(
                    id,
                    gtpChallengeId!,
                    gtpCode.trim(),
                  );

                  if (out.status !== "ok")
                    throw new Error(out.message || "Неуспешно");

                  const updated = await api.listObligations(id);
                  setObligations(updated);

                  setGtpCaptchaOpen(false);
                  setGtpCode("");
                } catch (e: any) {
                  setErr(e.message ?? "Грешка");
                } finally {
                  setGtpSolving(false);
                }
              }}
            >
              {gtpSolving ? "Проверяваме..." : "Потвърди"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
