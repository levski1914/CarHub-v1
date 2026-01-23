// components/landing/CTA.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CTA() {
  return (
    <section className="max-w-6xl mx-auto px-4 pb-14">
      <Card className="bg-background/70 backdrop-blur border shadow-sm">
        <CardContent className="p-6 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-semibold">
              Спри да мислиш за срокове. CarHub ще ти напомня.
            </h3>
            <p className="text-muted-foreground">
              Добави колите си и получавай известия преди да стане късно.
            </p>
          </div>

          <div className="flex gap-3">
            <Button asChild size="lg" className="bg-sky-400">
              <Link href="/vehicles">Към таблото</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/register">Регистрация</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div id="faq" className="mt-10 text-sm text-muted-foreground space-y-2">
        <div className="font-medium text-foreground">Въпроси</div>
        <p className="text-white">
          • Автопопълването може да изисква потвърждение (CAPTCHA) според
          външните системи.
        </p>
        <p className="text-white">
          • Данните се показват като помощ — винаги проверявай документите.
        </p>
      </div>
    </section>
  );
}
