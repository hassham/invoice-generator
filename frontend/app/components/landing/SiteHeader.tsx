"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getCurrentSession, logout, type LoggedInAccount } from "../../lib/auth";
import { BusinessSwitcher } from "../business/BusinessSwitcher";

// IG-327 / IG-329: Bevorly styling (docs/BRANDINGGUIDELINES.md sections 5, 10 and 11). Behaviour,
// links and accessible names are unchanged from the earlier header.
const navLinks = [
  { href: "/invoice/create", label: "Invoice Generator" },
  { href: "#templates", label: "Templates" },
  { href: "#pricing", label: "Pricing" },
];

const workflowLinks = [
  { href: "/documents", label: "All documents" },
  { href: "/documents/estimates", label: "Estimates" },
  { href: "/receipts", label: "Receipts" },
  { href: "/credit-notes", label: "Credit notes" },
  { href: "/documents/purchase-orders", label: "Purchase orders" },
  { href: "/recurring", label: "Recurring invoices" },
  { href: "/reminders", label: "Reminders" },
  { href: "/reports", label: "Reports" },
] as const;

const navLink = "text-sm font-medium text-muted transition-colors hover:text-ink";
const mobileNavLink = "rounded-md px-2 py-2 text-sm font-medium text-muted transition-colors hover:bg-canvas hover:text-ink";
const primaryCta =
  "rounded-full border-[1.5px] border-ink bg-accent px-4 py-2 text-center text-sm font-semibold text-ink transition-colors hover:bg-[#c4ee1a]";
const secondaryCta =
  "whitespace-nowrap rounded-full border-[1.5px] border-ink bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-canvas";

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const workflowRef = useRef<HTMLDetailsElement>(null);
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
    <header className="sticky top-0 z-40 border-b border-border bg-paper">
      <div className={`mx-auto flex max-w-6xl items-center justify-between px-6 py-4 ${account ? "xl:gap-6" : ""}`}>
        <Link href="/" className="flex shrink-0 items-center gap-2 font-display text-xl font-bold tracking-tight text-ink">
          <Image src="/brand/bevorly-mark.svg" alt="" width={28} height={28} unoptimized />
          bevorly.
        </Link>

        {/* IG-68: the desktop nav + account block need ~1104px of content width when
            authenticated (measured directly) - Tailwind's md (768px) and even lg (1024px)
            breakpoints aren't wide enough and caused real page-level horizontal overflow on
            every authenticated page at tablet width. xl (1280px) is the first breakpoint with
            enough room; the hamburger/mobile-nav pattern below now covers tablet too. */}
        <nav aria-label="Primary" className="hidden shrink-0 items-center gap-5 xl:flex">
          {/* IG-202: public/marketing links (landing-page anchors + the anonymous Invoice
              Generator entry point) only make sense when signed out - once authenticated, the
              app-specific links below cover the same ground and these anchors don't even resolve
              to anything outside the landing page. */}
          {!account
            ? navLinks.map((link) => (
                <Link key={link.href} href={link.href} className={navLink}>
                  {link.label}
                </Link>
              ))
            : null}
          {account ? (
            <>
              <Link href="/dashboard" className={navLink}>
                Dashboard
              </Link>
              <Link href="/documents/invoices" className={navLink}>
                Invoices
              </Link>
              <Link href="/customers" className={navLink}>
                Customers
              </Link>
              <Link href="/items" className={navLink}>
                Items
              </Link>
              <Link href="/templates" className={navLink}>
                Templates
              </Link>
              <Link href="/settings/business" className={navLink}>
                Settings
              </Link>
              <details ref={workflowRef} className="group relative" onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
              }} onKeyDown={(event) => {
                if (event.key === "Escape" && event.currentTarget.open) {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}>
                <summary className={`${navLink} cursor-pointer list-none whitespace-nowrap rounded-md marker:content-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink`}>More <span aria-hidden="true">&#9662;</span></summary>
                <ul className="absolute right-0 top-full mt-3 w-52 rounded-2xl border border-border bg-paper p-2 shadow-lg">
                  {workflowLinks.map((link) => <li key={link.href}><Link className={`${mobileNavLink} block`} href={link.href} onClick={() => { if (workflowRef.current) workflowRef.current.open = false; }}>{link.label}</Link></li>)}
                </ul>
              </details>
            </>
          ) : null}
        </nav>

        <div className="hidden min-w-0 items-center gap-4 xl:flex">
          {account ? (
            <>
              <BusinessSwitcher />
              <span className="min-w-0 max-w-32 truncate text-sm font-medium text-muted" title={account.name ?? account.email}>{account.name ?? account.email}</span>
              <button type="button" onClick={handleLogout} className={secondaryCta}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={navLink}>
                Login
              </Link>
              <Link href="/signup" className={primaryCta}>
                Sign Up
              </Link>
            </>
          )}
        </div>

        <button
          ref={toggleRef}
          type="button"
          className={`${navLink} xl:hidden`}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? "Close menu" : "Open menu"}
        </button>
      </div>

      {isMenuOpen ? (
        <div id="mobile-nav" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-paper xl:hidden">
          <nav aria-label="Mobile primary" className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {!account
              ? navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={mobileNavLink} onClick={() => setIsMenuOpen(false)}>
                    {link.label}
                  </Link>
                ))
              : null}
            {account ? (
              <>
                <Link href="/invoice/create" className={`${primaryCta} mb-2`} onClick={() => setIsMenuOpen(false)}>
                  New invoice
                </Link>
                <Link href="/dashboard" className={mobileNavLink} onClick={() => setIsMenuOpen(false)}>
                  Dashboard
                </Link>
                <Link href="/documents/invoices" className={mobileNavLink} onClick={() => setIsMenuOpen(false)}>
                  Invoices
                </Link>
                <Link href="/customers" className={mobileNavLink} onClick={() => setIsMenuOpen(false)}>
                  Customers
                </Link>
                <Link href="/items" className={mobileNavLink} onClick={() => setIsMenuOpen(false)}>
                  Items
                </Link>
                <Link href="/templates" className={mobileNavLink} onClick={() => setIsMenuOpen(false)}>
                  Templates
                </Link>
                <Link href="/settings/business" className={mobileNavLink} onClick={() => setIsMenuOpen(false)}>
                  Settings
                </Link>
                <details className="px-2">
                  <summary className="cursor-pointer py-2 text-sm font-semibold text-ink">More workflows</summary>
                  <div className="grid gap-1 border-l border-border pl-2">
                    {workflowLinks.map((link) => <Link key={link.href} className={mobileNavLink} href={link.href} onClick={() => setIsMenuOpen(false)}>{link.label}</Link>)}
                  </div>
                </details>
              </>
            ) : null}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
              {account ? (
                <>
                  <BusinessSwitcher mobile onNavigate={() => setIsMenuOpen(false)} />
                  <span className="break-all px-2 py-2 text-sm font-medium text-muted">{account.name ?? account.email}</span>
                  <button type="button" onClick={handleLogout} className={secondaryCta}>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className={mobileNavLink} onClick={() => setIsMenuOpen(false)}>
                    Login
                  </Link>
                  <Link href="/signup" className={primaryCta} onClick={() => setIsMenuOpen(false)}>
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
