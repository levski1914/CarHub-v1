"use client";

import { useState } from "react";
import { api, Vehicle } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Settings, Pencil, Trash2 } from "lucide-react";

function normalizePlate(s: string) {
  return s.replace(/\s+/g, "").toUpperCase();
}

export function VehicleRowActions({
  vehicle,
  onUpdated,
  onDeleted,
}: {
  vehicle: Vehicle;
  onUpdated?: (v: Vehicle) => void;
  onDeleted?: (id: string) => void;
}) {
  const [openEdit, setOpenEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const [plate, setPlate] = useState(vehicle.plate);
  const [make, setMake] = useState(vehicle.make);
  const [model, setModel] = useState(vehicle.model);

  async function save() {
    setSaving(true);
    try {
      const updated = await api.updateVehicle(vehicle.id, {
        plate: normalizePlate(plate),
        make: make.trim(),
        model: model.trim(),
      });
      onUpdated?.(updated);
      setOpenEdit(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const ok = confirm(
      `Сигурен ли си, че искаш да изтриеш ${vehicle.plate}? Това ще изтрие и записаните задължения.`,
    );
    if (!ok) return;

    await api.deleteVehicle(vehicle.id);
    onDeleted?.(vehicle.id);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Действия">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setOpenEdit(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Редактирай
          </DropdownMenuItem>

          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={remove}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Изтрий
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
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
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="CB1234AB"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ще бъде запазено като: <b>{normalizePlate(plate || "")}</b>
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Марка</label>
              <Input value={make} onChange={(e) => setMake(e.target.value)} />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Модел</label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenEdit(false)}
              disabled={saving}
            >
              Отказ
            </Button>
            <Button onClick={save} disabled={saving || !plate.trim()}>
              {saving ? "Запазваме..." : "Запази"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
