import { NextResponse } from "next/server";
import { store } from "@/app/api/_store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const v = store.vehicles.find((x) => x.id === id);
  if (!v) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json(v);
}
