// components/landing/LandingNavbar.tsx
"use client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur">
      <div className="max-w-8xl mx-auto h-14 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center shrink-0">
          <span className="h-50 w-[180px] overflow-hidden flex items-center">
            <img
              src="/logo.png"
              alt="CarHub"
              className="max-h-50 max-w-[180px] object-contain block"
            />
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground">
            Функции
          </a>
          <a href="#pricing" className="hover:text-foreground">
            Планове
          </a>
          <a href="#faq" className="hover:text-foreground">
            Въпроси
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Вход</Link>
          </Button>
          <Button asChild className="bg-sky-400">
            <Link href="/vehicles">Към таблото</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
