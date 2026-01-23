// components/landing/Pricing.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Pricing() {
  return (
    <section id="pricing" className="max-w-6xl mx-auto px-4 py-14">
      <div className="space-y-2 mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold">Планове</h2>
        <p className="text-muted">
          MVP предложение — можеш да ги промениш когато поискаш.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="bg-background/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Free</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-semibold">0 €</div>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• 1 автомобил</li>
              <li>• Ръчни срокове</li>
              <li>• Email напомняния</li>
            </ul>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/vehicles">Започни</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary bg-background/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Plus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-semibold">
              9.99 € <span className="text-sm text-muted-foreground">/мес</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• до 5 автомобила</li>
              <li>• Email + SMS</li>
              <li>• Автопопълване (където е възможно)</li>
            </ul>
            <Button className="w-full bg-sky-500" asChild>
              <Link href="/vehicles">Вземи Plus</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-background/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-semibold">
              29.99 €{" "}
              <span className="text-sm text-muted-foreground">/мес</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• неограничени автомобили</li>
              <li>• Много получатели</li>
              <li>• История + документи</li>
            </ul>
            <Button variant="outline" className="w-full" asChild>
              <a href="#faq">Свържи се</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
