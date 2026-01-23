import { NextResponse } from "next/server";
import { store, computeStatus } from "@/app/api/_store";
import { Vehicle } from "@/lib/api";

export async function GET() {
  // refresh statuses
  store.vehicles = store.vehicles.map((v) => ({ ...v }));
  return NextResponse.json(store.vehicles);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Pick<Vehicle, "plate" | "make" | "model">;

  const id = `v_${Math.random().toString(36).slice(2, 9)}`;
  const vehicle: Vehicle = {
    id,
    plate: body.plate?.trim() || "—",
    make: body.make?.trim() || "—",
    model: body.model?.trim() || "—",
    status: "ok",
  };

  store.vehicles.unshift(vehicle);
  return NextResponse.json(vehicle);
}
