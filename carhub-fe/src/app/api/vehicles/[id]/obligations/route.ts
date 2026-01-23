import { NextResponse } from "next/server";
import { store, computeStatus } from "@/app/api/_store";
import { Obligation } from "@/lib/api";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const list = store.obligations
    .filter((o) => o.vehicleId === params.id)
    .map((o) => ({ ...o, status: computeStatus(o.dueDate) }));
  return NextResponse.json(list);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = (await req.json()) as Pick<Obligation, "type" | "dueDate">;

  const id = `o_${Math.random().toString(36).slice(2, 9)}`;
  const obligation: Obligation = {
    id,
    vehicleId: params.id,
    type: body.type,
    dueDate: body.dueDate,
    status: computeStatus(body.dueDate),
  };

  store.obligations.unshift(obligation);
  return NextResponse.json(obligation);
}
