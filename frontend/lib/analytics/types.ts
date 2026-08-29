export type AcquisitionSource =
  | { type: "utm"; value: string }
  | { type: "direct" }
  | { type: "search"; engine: string }
  | { type: "referral"; host: string };

export type AnonymousGateAction = "download" | "print";

export type AnalyticsEvent =
  | { name: "landing_page_view"; properties: { source: AcquisitionSource } }
  | { name: "invoice_editor_start"; properties: { entryPoint: "hero" | "pricing_free_plan" } }
  // IG-32: a funnel over IG-30's account gate, from three positive events rather than a directly
  // recorded "abandonment" - a visitor who is shown the gate but never converts is the abandonment
  // rate, computed downstream. None of these carry invoice contents (FSD/IG-32 AC), only the
  // requested action and, for conversion, which auth method was used.
  | { name: "anonymous_gate_shown"; properties: { action: AnonymousGateAction } }
  | { name: "anonymous_gate_dismissed"; properties: { action: AnonymousGateAction } }
  | { name: "anonymous_gate_conversion"; properties: { action: AnonymousGateAction; method: "signup" | "login" } }
  | { name: "pending_action_completed"; properties: { action: AnonymousGateAction } };

export interface AnalyticsSink {
  track(event: AnalyticsEvent): void;
}
