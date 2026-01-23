// components/landing/Features.tsx
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    title: "Напомняния навреме",
    desc: "Email и SMS преди изтичане — 7/3/1 дни или по твой избор.",
  },
  {
    title: "Една таблица за всичко",
    desc: "ГО, ГТП, винетка, данък — видими на едно място за всяка кола.",
  },
  {
    title: "История и документи",
    desc: "Пази срокове и бележки. По-късно: качване на полици и фактури.",
  },
  {
    title: "Автопопълване (където е възможно)",
    desc: "Системата извлича дати автоматично. При нужда — потвърждение.",
  },
  {
    title: "За фирми с автопарк",
    desc: "Подходящо за 5+ коли: по-малко пропуски, по-малко глоби.",
  },
  {
    title: "Абонаментен модел",
    desc: "Пробен период + планове за частни лица и фирми.",
  },
];

export default function Features() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-4 py-14">
      <div className="space-y-2 mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold">Функции</h2>
        <p className="text-muted-foreground">
          Фокус върху най-важното: да не забравяш нищо по колата.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title} className="bg-background/70 backdrop-blur">
            <CardContent className="p-5 space-y-2">
              <div className="font-medium">{f.title}</div>
              <div className="text-sm text-muted-foreground">{f.desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
