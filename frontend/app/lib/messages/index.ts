import { en, type MessageKey } from "./en";

export type { MessageKey };

/**
 * IG-241: looks up user-facing text by key and fills {placeholders} from params. A placeholder with no
 * matching param is left as written, so a missing value shows up on screen instead of disappearing.
 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template: string = en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}
