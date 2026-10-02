export type NavigationSection = "/" | "/transactions" | "/budgets" | "/more";

export function navigationSection(pathname: string): NavigationSection {
  if (pathname === "/" || pathname === "/quick-entry" || pathname === "/balance-correction") return "/";
  if (pathname === "/transactions" || pathname.startsWith("/transaction/")) return "/transactions";
  if (pathname === "/budgets" || pathname.startsWith("/budget/")) return "/budgets";
  return "/more";
}
