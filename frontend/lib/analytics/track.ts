import type { AnalyticsEvent, AnalyticsSink } from "./types";

class ConsoleAnalyticsSink implements AnalyticsSink {
  track(event: AnalyticsEvent): void {
    // No analytics provider is configured yet - see docs/PRD.md section 29 and the IG-89 Jira
    // comment. This sink is a deliberate placeholder; swap it via setAnalyticsSink() once one
    // is chosen, without changing any call site that emits events.
    console.info("[analytics]", event.name, event.properties);
  }
}

let activeSink: AnalyticsSink = new ConsoleAnalyticsSink();

export function setAnalyticsSink(sink: AnalyticsSink): void {
  activeSink = sink;
}

export function resetAnalyticsSink(): void {
  activeSink = new ConsoleAnalyticsSink();
}

/**
 * Analytics failures must never block the user journey (IG-90) - a throwing sink is swallowed
 * here rather than propagated to the caller (e.g. a CTA's onClick, which must still navigate).
 */
export function track(event: AnalyticsEvent): void {
  try {
    activeSink.track(event);
  } catch {
    // Intentionally ignored.
  }
}
