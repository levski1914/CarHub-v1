import { NextResponse } from "next/server";
import { store } from "@/app/api/_store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const v = store.vehicles.find((x) => x.id === params.id);
  if (!v) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(v);
}
