// components/landing/Footer.tsx
export default function Footer() {
  return (
    <footer className="border-t bg-background/50">
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-muted-foreground flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>© {new Date().getFullYear()} CarHub</div>
        <div className="flex gap-4">
          <span>Политика</span>
          <span>Контакт</span>
          <span>Условия</span>
        </div>
      </div>
    </footer>
  );
}
