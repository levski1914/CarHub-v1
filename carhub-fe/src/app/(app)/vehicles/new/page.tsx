"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NewVehiclePage() {
  const r = useRouter();
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit() {
    setErr("");
    try {
      const v = await api.createVehicle({ plate, make, model } as any);
      r.push(`/vehicles/${v.id}`);
    } catch (e: any) {
      setErr(e.message ?? "Грешка");
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Добави автомобил</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {err && <p className="text-sm text-red-600">{err}</p>}

          <div className="space-y-2">
            <Label>Рег. номер</Label>
            <Input
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="CA1234AB"
            />
          </div>
          <div className="space-y-2">
            <Label>Марка</Label>
            <Input
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="VW"
            />
          </div>
          <div className="space-y-2">
            <Label>Модел</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Golf"
            />
          </div>

          <Button className="w-full" onClick={onSubmit}>
            Запази
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
