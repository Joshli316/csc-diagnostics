export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "\"": return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

/** Replace `{name}` placeholders with vars[name]; leave unknown placeholders verbatim. */
export function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}
