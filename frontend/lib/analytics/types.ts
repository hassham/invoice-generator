export type AcquisitionSource =
  | { type: "utm"; value: string }
  | { type: "direct" }
  | { type: "search"; engine: string }
  | { type: "referral"; host: string };

export type AnalyticsEvent =
  | { name: "landing_page_view"; properties: { source: AcquisitionSource } }
  | { name: "invoice_editor_start"; properties: { entryPoint: "hero" | "pricing_free_plan" } };

export interface AnalyticsSink {
  track(event: AnalyticsEvent): void;
}
