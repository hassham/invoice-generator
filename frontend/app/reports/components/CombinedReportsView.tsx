"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCombinedOutstanding,
  getCombinedOverdue,
  getCombinedRevenue,
  getCombinedTax,
  type CombinedInvoiceList,
  type CombinedRevenue,
  type CombinedTax,
  type CurrencyAmount,
} from "../../lib/combinedReports";
import { t } from "../../lib/messages";

interface CombinedData {
  revenue: CombinedRevenue;
  outstanding: CombinedInvoiceList;
  overdue: CombinedInvoiceList;
  tax: CombinedTax;
}

/** Local calendar date as YYYY-MM-DD. */
function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function TotalsByCurrency({ totals }: { totals: CurrencyAmount[] }) {
  if (totals.length === 0) {
    return <p className="text-sm text-slate-600">{t("combined.none")}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-4 text-sm">
      {totals.map((total) => (
        <li key={total.currency} className="font-semibold text-slate-900">
          {formatMoney(total.amount, total.currency)}
        </li>
      ))}
    </ul>
  );
}

/**
 * IG-242: every business the user can access, with its figures labelled by business and currency, and
 * totals shown per currency only. The per-business sections show the same figures as each business's own
 * report, because they come from the same server calculation.
 */
export function CombinedReportsView() {
  const [data, setData] = useState<CombinedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const startDate = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const endDate = isoDate(now);

    Promise.all([getCombinedRevenue(startDate, endDate), getCombinedOutstanding(), getCombinedOverdue(), getCombinedTax(startDate, endDate)])
      .then(([revenue, outstanding, overdue, tax]) => {
        if (!cancelled) setData({ revenue, outstanding, overdue, tax });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("combined.error"));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p role="alert" className="text-sm text-red-700">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-slate-600">{t("combined.loading")}</p>;
  }

  if (data.revenue.businesses.length === 0) {
    return <p className="text-sm text-slate-600">{t("combined.noBusinesses")}</p>;
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-950">{t("combined.title")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("combined.intro")}</p>
        <Link href="/reports" className="mt-2 inline-block text-sm font-semibold text-slate-700 underline">
          {t("combined.backToRevenue")}
        </Link>
      </header>

      <section aria-labelledby="combined-revenue">
        <h2 id="combined-revenue" className="text-lg font-semibold text-slate-950">
          {t("combined.revenue.heading")} · {t("combined.period")}
        </h2>
        <h3 className="mt-3 text-sm font-medium text-slate-700">{t("combined.totals")}</h3>
        <TotalsByCurrency totals={data.revenue.totalsByCurrency.map((total) => ({ currency: total.currency, amount: total.total }))} />
        <ul className="mt-4 divide-y divide-slate-200">
          {data.revenue.businesses.map((business) => (
            <li key={business.businessId} className="flex items-center justify-between py-2 text-sm">
              <span className="text-slate-900">{business.businessName}</span>
              <span>{formatMoney(business.total, business.currency)}</span>
            </li>
          ))}
        </ul>
      </section>

      {[
        { id: "combined-outstanding", heading: t("combined.outstanding.heading"), list: data.outstanding },
        { id: "combined-overdue", heading: t("combined.overdue.heading"), list: data.overdue },
      ].map(({ id, heading, list }) => (
        <section key={id} aria-labelledby={id}>
          <h2 id={id} className="text-lg font-semibold text-slate-950">{heading}</h2>
          <h3 className="mt-3 text-sm font-medium text-slate-700">{t("combined.totals")}</h3>
          <TotalsByCurrency totals={list.amountDueByCurrency} />
          <div className="mt-4 space-y-4">
            {list.businesses.map((business) => (
              <div key={business.businessId}>
                <h3 className="text-sm font-semibold text-slate-900">{business.businessName}</h3>
                {business.invoices.length === 0 ? (
                  <p className="text-sm text-slate-600">{t("combined.none")}</p>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {business.invoices.map((invoice) => (
                      <li key={invoice.id} className="flex items-center justify-between py-2 text-sm">
                        <span>{invoice.invoiceNumber} · {invoice.customerName}</span>
                        <span>{formatMoney(invoice.amountDue, invoice.currency)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section aria-labelledby="combined-tax">
        <h2 id="combined-tax" className="text-lg font-semibold text-slate-950">
          {t("combined.tax.heading")} · {t("combined.period")}
        </h2>
        <h3 className="mt-3 text-sm font-medium text-slate-700">{t("combined.totals")}</h3>
        <TotalsByCurrency totals={data.tax.taxCollectedByCurrency} />
        <ul className="mt-4 divide-y divide-slate-200">
          {data.tax.businesses.map((business) => (
            <li key={business.businessId} className="flex items-center justify-between py-2 text-sm">
              <span className="text-slate-900">{business.businessName}</span>
              <span>{formatMoney(business.summary.totalTaxCollected, business.summary.currency)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
