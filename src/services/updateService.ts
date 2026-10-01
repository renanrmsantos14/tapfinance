type Release = {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  body?: string;
  assets: Array<{ name: string; browser_download_url: string; digest: string | null; size: number }>;
};

export type Update = { version: string; url: string; digest: string; prerelease: boolean; publishedAt: string; size: number; notes: string };

export function isNewerVersion(latest: string, installed: string): boolean {
  const parse = (value: string) => {
    const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+[\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*)?$/.exec(value);
    const prerelease = match?.[4]?.split(".") ?? [];
    if (!match || prerelease.some((part) => /^\d+$/.test(part) && part.length > 1 && part[0] === "0")) throw new Error("Formato de versão inválido.");
    return { core: match.slice(1, 4).map((part) => BigInt(part)), prerelease };
  };
  const next = parse(latest); const current = parse(installed);
  for (let i = 0; i < 3; i += 1) if (next.core[i] !== current.core[i]) return next.core[i] > current.core[i];
  if (!next.prerelease.length || !current.prerelease.length) return !next.prerelease.length && !!current.prerelease.length;
  for (let i = 0; i < Math.max(next.prerelease.length, current.prerelease.length); i += 1) {
    const a = next.prerelease[i]; const b = current.prerelease[i];
    if (a === undefined || b === undefined) return a !== undefined;
    if (a === b) continue;
    const numericA = /^\d+$/.test(a); const numericB = /^\d+$/.test(b);
    if (numericA && numericB) return BigInt(a) > BigInt(b);
    if (numericA !== numericB) return !numericA;
    return a > b;
  }
  return false;
}

export function selectAvailableUpdates(payload: unknown, installedVersion: string): Update[] {
  isNewerVersion(installedVersion, installedVersion);
  if (!Array.isArray(payload)) throw new Error("Resposta de versões do GitHub inválida.");
  const updates = new Map<string, Update>();
  for (const entry of payload) {
    if (!entry || typeof entry !== "object") continue;
    const release = entry as Release;
    if (release.draft !== false || typeof release.prerelease !== "boolean" || typeof release.tag_name !== "string" || !Array.isArray(release.assets) || typeof release.published_at !== "string" || !Number.isFinite(Date.parse(release.published_at))) continue;
    try { if (!isNewerVersion(release.tag_name, installedVersion)) continue; } catch { continue; }
    const expectedUrl = `https://github.com/renanrmsantos14/tapfinance/releases/download/${encodeURIComponent(release.tag_name)}/app-release.apk`;
    const asset = release.assets.find((item) => item && item.name === "app-release.apk" && item.browser_download_url === expectedUrl && typeof item.digest === "string" && /^sha256:[0-9a-f]{64}$/i.test(item.digest) && Number.isSafeInteger(item.size) && item.size > 0 && item.size <= 200_000_000);
    if (!asset) continue;
    const version = release.tag_name.replace(/^v/, "");
    updates.set(version, { version, url: asset.browser_download_url, digest: asset.digest!.toLowerCase(), prerelease: release.prerelease || version.split("+")[0].includes("-"), publishedAt: release.published_at, size: asset.size, notes: typeof release.body === "string" ? release.body.slice(0, 8000) : "" });
  }
  return [...updates.values()].sort((a, b) => isNewerVersion(a.version, b.version) ? -1 : isNewerVersion(b.version, a.version) ? 1 : 0);
}

export async function checkForUpdates(installedVersion: string): Promise<Update[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const releases: unknown[] = [];
    for (let page = 1; page <= 20; page += 1) {
      const response = await fetch(`https://api.github.com/repos/renanrmsantos14/tapfinance/releases?per_page=100&page=${page}`, {
        headers: { Accept: "application/vnd.github+json" }, signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Consulta ao GitHub falhou (${response.status}).`);
      const batch: unknown = await response.json();
      if (!Array.isArray(batch)) throw new Error("Resposta de versões do GitHub inválida.");
      releases.push(...batch);
      if (!response.headers.get("link")?.includes('rel="next"')) return selectAvailableUpdates(releases, installedVersion);
    }
    throw new Error("O catálogo de versões excedeu o limite da consulta. Tente novamente mais tarde.");
  } catch (error) {
    if (controller.signal.aborted) throw new Error("A consulta de versões demorou demais. Confira a conexão e tente novamente.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkForUpdate(installedVersion: string): Promise<Update | null> {
  return (await checkForUpdates(installedVersion))[0] ?? null;
}
