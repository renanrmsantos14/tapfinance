type Release = {
  tag_name: string;
  html_url: string;
  assets: Array<{ name: string; browser_download_url: string; digest: string | null }>;
};

export type Update = { version: string; url: string; digest: string };

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

export async function checkForUpdate(installedVersion: string): Promise<Update | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetch("https://api.github.com/repos/renanrmsantos14/tapfinance/releases/latest", {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`Consulta ao GitHub falhou (${response.status}).`);
  const release = await response.json() as Release;
  if (!isNewerVersion(release.tag_name, installedVersion)) return null;
  const asset = release.assets.find((item) => item.name === "app-release.apk");
  if (!asset || !/^sha256:[0-9a-f]{64}$/i.test(asset.digest ?? "")) {
    throw new Error("A versão nova ainda não tem um APK verificado.");
  }
  return { version: release.tag_name.replace(/^v/, ""), url: asset.browser_download_url, digest: asset.digest! };
}
