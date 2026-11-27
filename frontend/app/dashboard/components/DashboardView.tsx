"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDashboardSummary, type DashboardSummary } from "../../lib/dashboard";
import { computePeriodRange, PERIOD_PRESET_LABELS, PERIOD_PRESETS, type PeriodPreset } from "../lib/period";
import { DashboardAttention, DashboardEmpty, DashboardIcon, DashboardMetrics, formatDate, RecentInvoices } from "./DashboardPresentation";
import styles from "./DashboardView.module.css";

type Result =
  | { status: "loading" }
  | { status: "loaded"; summary: DashboardSummary; periodLabel: string }
  | { status: "error"; message: string };

export function DashboardView() {
  const [preset, setPreset] = useState<PeriodPreset>("ThisMonth");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [result, setResult] = useState<Result>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const invalidRange = preset === "Custom" && Boolean(customStart && customEnd && customStart > customEnd);
  const incompleteRange = preset === "Custom" && (!customStart || !customEnd);

  useEffect(() => {
    if (invalidRange || incompleteRange) return;
    let cancelled = false;
    const range = preset === "Custom" ? { startDate: customStart, endDate: customEnd } : computePeriodRange(preset);
    const periodLabel = preset === "Custom"
      ? formatDate(range.startDate) + " to " + formatDate(range.endDate)
      : PERIOD_PRESET_LABELS[preset];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-sync presentation with the requested server period.
    setResult({ status: "loading" });
    getDashboardSummary(range.startDate, range.endDate)
      .then((summary) => { if (!cancelled) setResult({ status: "loaded", summary, periodLabel }); })
      .catch((error: unknown) => {
        if (!cancelled) setResult({ status: "error", message: error instanceof Error ? error.message : "Failed to load the dashboard." });
      });
    return () => { cancelled = true; };
  }, [preset, customStart, customEnd, invalidRange, incompleteRange, attempt]);

  const summary = result.status === "loaded" ? result.summary : null;
  const isEmpty = summary?.recentInvoices.length === 0;
  // Choosing an incomplete or invalid custom range also cancels an in-flight request.
  const isLoading = result.status === "loading" && !invalidRange && !incompleteRange;
  const field = "workspace-field " + styles.field;

  return (
    <div className={styles.dashboard}>
      <header className={styles.hero}>
        <div>
          <p className={styles.heroKicker}><span aria-hidden="true" /> Workspace / Overview</p>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.intro}>Your business at a glance.</p>
        </div>
        {!isEmpty ? (
          <Link href="/invoice/create" className={"workspace-button-primary " + styles.heroAction}>
            <DashboardIcon name="plus" /> New invoice
          </Link>
        ) : null}
      </header>

      <section aria-labelledby="dashboard-overview" className={styles.overview}>
        <div className={styles.overviewHeader}>
          <div>
            <p className={styles.kicker}>The numbers</p>
            <h2 id="dashboard-overview" className={styles.sectionTitle}>Billing overview</h2>
            {result.status === "loaded" && !isEmpty ? (
              <p className={styles.sectionCopy}>Showing activity for <strong>{result.periodLabel}</strong> · {result.summary.currency}</p>
            ) : null}
          </div>
          <div className={styles.filters}>
            <div className={styles.period}>
              <label htmlFor="dashboard-period"><DashboardIcon name="calendar" /> Period</label>
              <select id="dashboard-period" value={preset} onChange={(event) => setPreset(event.target.value as PeriodPreset)} className={field}>
                {PERIOD_PRESETS.map((option) => <option key={option} value={option}>{PERIOD_PRESET_LABELS[option]}</option>)}
              </select>
            </div>
            {preset === "Custom" ? (
              <div className={styles.customDates}>
                <div>
                  <label htmlFor="dashboard-period-start">Start date</label>
                  <input id="dashboard-period-start" type="date" value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)} className={field}
                    aria-invalid={invalidRange || undefined} aria-describedby="dashboard-range-help" />
                </div>
                <div>
                  <label htmlFor="dashboard-period-end">End date</label>
                  <input id="dashboard-period-end" type="date" value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)} className={field}
                    aria-invalid={invalidRange || undefined} aria-describedby="dashboard-range-help" />
                </div>
                <p id="dashboard-range-help" className={styles.rangeHelp} aria-live="polite" data-invalid={invalidRange}>
                  {invalidRange ? "End date must be on or after the start date." : "Choose a start and end date to update the totals."}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {isLoading ? <p className={styles.loadingStatus} role="status">Loading dashboard…</p> : null}
        <div aria-busy={isLoading}>
          {isLoading ? (
            <div className={styles.metrics} aria-hidden="true">
              {[0, 1, 2, 3].map((key) => <span className={styles.skeleton} key={key} />)}
            </div>
          ) : null}
          {result.status === "error" ? (
            <div className={styles.error}>
              <div role="alert"><p className={styles.errorTitle}>Couldn’t load the dashboard.</p><p>{result.message}</p></div>
              <button type="button" className="workspace-button-secondary" disabled={invalidRange || incompleteRange}
                onClick={() => setAttempt((current) => current + 1)}>Try again</button>
            </div>
          ) : null}
          {isEmpty ? <DashboardEmpty /> : null}
          {summary && !isEmpty ? <DashboardMetrics summary={summary} /> : null}
        </div>
      </section>

      {summary && !isEmpty ? (
        <>
          <DashboardAttention summary={summary} />
          <RecentInvoices invoices={summary.recentInvoices} />
        </>
      ) : null}
    </div>
  );
}
