type Release = {
  tag_name: string;
  html_url: string;
  assets: Array<{ name: string; browser_download_url: string; digest: string | null }>;
};

export type Update = { version: string; url: string; digest: string };

export function isNewerVersion(latest: string, installed: string): boolean {
  const parse = (value: string) => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value)?.slice(1).map(Number);
  const next = parse(latest);
  const current = parse(installed);
  if (!next || !current) throw new Error("Formato de versão inválido.");
  return next.some((part, index) => part > current[index] && next.slice(0, index).every((prefix, i) => prefix === current[i]));
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
