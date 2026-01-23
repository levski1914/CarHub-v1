// components/landing/Hero.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* backdrop */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.18),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.16),transparent_60%)]" />

      <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              ✅ Напомняния за ГО • ГТП • Винетка • Данък
            </div>

            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
              Всичко важно за колата —{" "}
              <span className="text-primary">на едно място</span>.
            </h1>

            <p className="text-zinc-500 md:text-lg">
              CarHub следи датите, предупреждава навреме и пази историята на
              документите ти. За частни лица и фирми с автопарк.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-sky-400">
                <Link href="/vehicles">Започни</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#features">Виж функциите</a>
              </Button>
            </div>

            <p className="text-xs text-muted">
              * MVP: Автопопълването зависи от външни системи и може да изисква
              потвърждение.
            </p>
          </div>

          <Card className="bg-background/70 backdrop-blur border shadow-sm">
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground mb-3">
                Примерен изглед
              </div>
              <div className="rounded-xl border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Skoda Octavia · B0597BM</div>
                  <div className="text-xs rounded-full border px-2 py-1">
                    Предстои
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">ГТП</div>
                    <div className="font-medium">11.06.2026</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">Винетка</div>
                    <div className="font-medium">27.01.2026</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">ГО</div>
                    <div className="font-medium">23.01.2026</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">Данък</div>
                    <div className="font-medium">—</div>
                  </div>
                </div>

                <div className="rounded-lg border bg-background/70 p-3 text-sm">
                  🔔 Най-близко: <b>ГО</b> за <b>B0597BM</b> до{" "}
                  <b>23.01.2026</b>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
