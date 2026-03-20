import { NextResponse } from "next/server";
import { store, computeStatus } from "@/app/api/_store";
import { Obligation } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const list = store.obligations
    .filter((o) => o.vehicleId === id)
    .map((o) => ({ ...o, status: computeStatus(o.dueDate) }));

  return NextResponse.json(list);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as Pick<Obligation, "type" | "dueDate">;

  const obligation: Obligation = {
    id: `o_${Math.random().toString(36).slice(2, 9)}`,
    vehicleId: id,
    type: body.type,
    dueDate: body.dueDate,
    status: computeStatus(body.dueDate),
  };

  store.obligations.unshift(obligation);
  return NextResponse.json(obligation);
}
