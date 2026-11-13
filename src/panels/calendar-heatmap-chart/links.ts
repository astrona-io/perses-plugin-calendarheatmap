/** Values a day or incident link template can use, as `${name}`. */
export interface LinkContext {
  /** `2026-10-09`, the day in the panel's time zone. */
  day: string;
  /** Start of the day, epoch ms. */
  from: number;
  /** Start of the next day, epoch ms. */
  to: number;
  incident?: string;
}

const KNOWN = new Set(["day", "from", "to", "incident"]);

/**
 * Replaces `${day}`, `${from}`, `${to}` and `${incident}`, URL-encoded. Other names are left as
 * they are, so dashboard variables still reach Perses' own replacement.
 */
export function interpolate(template: string, context: LinkContext): string {
  return template.replace(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, name) => {
    if (!KNOWN.has(name)) return match;
    const value = context[name as keyof LinkContext];
    return value === undefined ? "" : encodeURIComponent(String(value));
  });
}

/** Only http(s) and relative URLs; a `javascript:` or `data:` link is dropped. */
export function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
  if (!scheme) return true;
  const name = scheme[1]!.toLowerCase();
  return name === "http" || name === "https";
}

/** The interpolated link, or undefined when there is no template or it is unsafe. */
export function resolveLink(
  template: string | undefined,
  context: LinkContext,
): string | undefined {
  if (!template) return undefined;
  const href = interpolate(template, context);
  return isSafeHref(href) ? href : undefined;
}
