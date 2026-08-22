"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/invoice/create", label: "Invoice Generator" },
  { href: "#templates", label: "Templates" },
  { href: "#pricing", label: "Pricing" },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-950">
          Invoice App
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Sign Up
          </Link>
        </div>

        <button
          type="button"
          className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? "Close menu" : "Open menu"}
        </button>
      </div>

      {isMenuOpen ? (
        <div id="mobile-nav" className="border-t border-slate-200 md:hidden">
          <nav aria-label="Mobile primary" className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-4">
              <Link
                href="/login"
                className="rounded-md px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-slate-950 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
