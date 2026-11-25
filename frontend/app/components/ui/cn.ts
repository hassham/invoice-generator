/** IG-327: joins class names, skipping empty values. Kept local so the design system adds no dependency. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
