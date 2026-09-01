"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getCurrentSession, logout, type LoggedInAccount } from "../../lib/auth";

const navLinks = [
  { href: "/invoice/create", label: "Invoice Generator" },
  { href: "#templates", label: "Templates" },
  { href: "#pricing", label: "Pricing" },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // IG-26: defaults to "logged out" and swaps in once /api/v1/auth/me resolves - there's no
  // synchronous way to know the session state before that first round trip completes.
  const [account, setAccount] = useState<LoggedInAccount | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentSession().then((current) => {
      if (!cancelled) {
        setAccount(current);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        toggleRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout().then(() => setAccount(null));
  };

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
          {account ? (
            <Link href="/customers" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950">
              Customers
            </Link>
          ) : null}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {account ? (
            <>
              <span className="text-sm font-medium text-slate-600">{account.name ?? account.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Log out
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        <button
          ref={toggleRef}
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
            {account ? (
              <Link
                href="/customers"
                className="rounded-md px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setIsMenuOpen(false)}
              >
                Customers
              </Link>
            ) : null}
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-4">
              {account ? (
                <>
                  <span className="px-2 py-2 text-sm font-medium text-slate-600">{account.name ?? account.email}</span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-full border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
