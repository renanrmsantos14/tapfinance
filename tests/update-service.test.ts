import assert from "node:assert/strict";
import test from "node:test";
import { checkForUpdates, isNewerVersion, selectAvailableUpdates } from "../src/services/updateService";

test("update comparison respects every numeric version component", () => {
  assert.equal(isNewerVersion("v1.1.5", "1.1.4"), true);
  assert.equal(isNewerVersion("v1.10.0", "1.9.9"), true);
  assert.equal(isNewerVersion("v1.1.4", "1.1.4"), false);
  assert.equal(isNewerVersion("v1.1.3", "1.1.4"), false);
});

const digest = `sha256:${"a".repeat(64)}`;
function release(tag: string, prerelease = true) {
  return { tag_name: tag, draft: false, prerelease, published_at: "2026-10-01T12:00:00Z", body: "Notas da versão", assets: [{ name: "app-release.apk", browser_download_url: `https://github.com/renanrmsantos14/tapfinance/releases/download/${tag}/app-release.apk`, digest, size: 100 }] };
}

test("release choices include betas and stable versions, sorted semantically without downgrade or duplicates", () => {
  const choices = selectAvailableUpdates([release("v1.2.0-beta.9"), release("v1.2.0-beta.10"), release("v1.2.0", false), release("v1.1.8", false), release("v1.2.0-beta.5"), release("v1.2.0-beta.10")], "1.2.0-beta.5");
  assert.deepEqual(choices.map((item) => item.version), ["1.2.0", "1.2.0-beta.10", "1.2.0-beta.9"]);
  assert.equal(choices[0].prerelease, false);
  assert.equal(choices[1].prerelease, true);
  assert.equal(choices[1].digest, digest);
});

test("drafts, malformed releases and APKs without trusted origin or digest are not installable", () => {
  const good = release("v1.2.0-beta.6");
  assert.deepEqual(selectAvailableUpdates([null, {}, { ...good, draft: true }, { ...good, tag_name: "invalid" }, { ...good, assets: [] }, { ...good, assets: [{ ...good.assets[0], digest: null }] }, { ...good, assets: [{ ...good.assets[0], browser_download_url: "https://evil.example/app-release.apk" }] }], "1.2.0-beta.5"), []);
  assert.throws(() => selectAvailableUpdates({}, "1.2.0-beta.5"), /resposta/i);
});

test("release checks paginate the releases endpoint and report HTTP failure without partial choices", async () => {
  const original = globalThis.fetch; const urls: string[] = [];
  try {
    globalThis.fetch = async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify([release(urls.length === 1 ? "v1.2.0-beta.6" : "v1.2.0-beta.7")]), { headers: urls.length === 1 ? { Link: '<https://api.github.com/repos/renanrmsantos14/tapfinance/releases?per_page=100&page=2>; rel="next"' } : {} });
    };
    assert.deepEqual((await checkForUpdates("1.2.0-beta.5")).map((item) => item.version), ["1.2.0-beta.7", "1.2.0-beta.6"]);
    assert.equal(urls.length, 2);
    assert.ok(urls.every((url) => !url.includes("/latest")));
    globalThis.fetch = async () => new Response("rate limited", { status: 403 });
    await assert.rejects(checkForUpdates("1.2.0-beta.5"), /403/);
    let page = 0;
    globalThis.fetch = async () => ++page === 1 ? new Response(JSON.stringify([release("v1.2.0-beta.6")]), { headers: { Link: '<https://api.github.com/repos/renanrmsantos14/tapfinance/releases?page=2>; rel="next"' } }) : new Response("server error", { status: 503 });
    await assert.rejects(checkForUpdates("1.2.0-beta.5"), /503/);
  } finally { globalThis.fetch = original; }
});

test("update comparison accepts beta installations without downgrading to an older stable release", () => {
  assert.equal(isNewerVersion("v1.1.8", "1.2.0-beta.5"), false);
  assert.equal(isNewerVersion("v1.2.0", "1.2.0-beta.5"), true);
  assert.equal(isNewerVersion("v1.2.0-beta.5", "1.2.0-beta.4"), true);
  assert.equal(isNewerVersion("v1.2.0-beta.10", "1.2.0-beta.9"), true);
  assert.equal(isNewerVersion("v1.2.0-beta.5", "1.2.0"), false);
});

test("semantic prerelease ordering ignores build metadata and rejects malformed versions", () => {
  const versions = ["1.2.0-alpha", "1.2.0-alpha.1", "1.2.0-alpha.beta", "1.2.0-beta", "1.2.0-beta.2", "1.2.0-beta.11", "1.2.0-rc.1", "1.2.0"];
  for (let i = 1; i < versions.length; i += 1) {
    assert.equal(isNewerVersion(versions[i], versions[i - 1]), true);
    assert.equal(isNewerVersion(versions[i - 1], versions[i]), false);
  }
  assert.equal(isNewerVersion("1.2.0-beta.5+build.2", "1.2.0-beta.5+build.1"), false);
  for (const invalid of ["1.2", "1.2.0-beta..5", "1.2.0-beta.05", "01.2.0", "garbage"]) assert.throws(() => isNewerVersion(invalid, "1.2.0"), /versão inválido/);
});
