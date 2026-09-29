import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/yield/shell";
import { WriteBox } from "@/components/yield/write-box";
import { submitGenlayerWrite } from "@/lib/yieldtruth/chain-write";

export const Route = createFileRoute("/opportunities/new")({ component: SubmitPage });

function SubmitPage() {
  const [ready, setReady] = useState(false);
  const [protocol, setProtocol] = useState("Aave");
  const [chain, setChain] = useState("Ethereum");
  const [asset, setAsset] = useState("USDC");
  const [label, setLabel] = useState("Aave supply interest");
  const [apy, setApy] = useState("variable");
  const [canonical, setCanonical] = useState("https://aave.com/docs/aave-v3/concepts/liquidity-pool");
  const [urls, setUrls] = useState("https://aave.com/help/supplying/supply-tokens\nhttps://ethereum.org/en/defi/");
  const [pool, setPool] = useState("");
  const [registry, setRegistry] = useState<string[]>([]);
  const evidence = urls.split("\n").map((item) => item.trim()).filter(Boolean);
  const payload = {
    protocol,
    chain,
    asset,
    label,
    advertised_apy: apy,
    canonical_url: canonical,
    evidence_urls: evidence,
    pool_id: pool,
  };
  const hosts = evidence.map((url) => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  });
  const tooLong =
    protocol.length > 64 || chain.length > 32 || asset.length > 32 || label.length > 80 || apy.length > 16 || canonical.length > 200 || pool.length > 64 || evidence.some((url) => url.length > 200);
  const invalidUrl = !canonical.startsWith("https://") || evidence.length === 0 || evidence.length > 4 || evidence.some((url) => !url.startsWith("https://"));
  const duplicateHost = new Set(hosts).size !== hosts.length || hosts.some((host) => host === "");
  const offRegistry =
    registry.length > 0
      ? [canonical, ...evidence].find((url) => {
          const host = (() => {
            try {
              return new URL(url).hostname.toLowerCase();
            } catch {
              return "";
            }
          })();
          return host !== "" && !registry.includes(host);
        })
      : undefined;
  const blank = [protocol, chain, asset, label, apy].some((value) => value.trim().length === 0);
  const disabledReason = blank
    ? "Fill in protocol, chain, asset, label, and APY before signing."
    : tooLong
      ? "One of the fields is longer than the contract allows."
      : invalidUrl
        ? "Add one to four https evidence URLs before signing."
        : duplicateHost
          ? "Each evidence URL must use a different host. The contract rejects two pages from the same site."
          : offRegistry
            ? "That host is not on the contract registry. Only enabled hosts can be evidence."
            : undefined;
  useEffect(() => {
    setReady(true);
    void fetch("/api/v1/sources")
      .then((response) => response.json())
      .then((body: { sources?: Array<{ host: string; enabled: boolean }> }) => {
        setRegistry((body.sources ?? []).filter((row) => row.enabled).map((row) => row.host.toLowerCase()));
      })
      .catch(() => setRegistry([]));
  }, []);
  return (
    <Shell>
      <div className="desk-wrap grid gap-8 py-10 lg:grid-cols-2">
        <div>
          <h1 className="text-5xl">Sign a submission</h1>
          {ready ? (
            <form className="mt-3 space-y-3" onSubmit={(event) => event.preventDefault()}>
          <p className="text-base leading-7">Fill the market in. Then your wallet signs it. Validators read the pages below. A homepage is usually too thin, and two URLs on the same host are rejected.</p>
          {[
            ["protocol", protocol, setProtocol],
            ["chain", chain, setChain],
            ["asset", asset, setAsset],
            ["label", label, setLabel],
            ["apy", apy, setApy],
          ].map(([name, value, setter]) => (
            <label key={String(name)} className="block text-sm capitalize" htmlFor={String(name)}>
              {String(name)}
              <input
                id={String(name)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line bg-cream px-3"
                value={String(value)}
                onChange={(event) => (setter as (next: string) => void)(event.target.value)}
              />
            </label>
          ))}
          <label className="block text-sm" htmlFor="canonical">
            Canonical URL
            <input id="canonical" className="mt-1 min-h-11 w-full rounded-xl border border-line bg-cream px-3" value={canonical} onChange={(event) => setCanonical(event.target.value)} />
          </label>
          <label className="block text-sm" htmlFor="urls">
            Evidence URLs, one per line
            <textarea id="urls" className="mt-1 min-h-28 w-full rounded-xl border border-line bg-cream p-3" value={urls} onChange={(event) => setUrls(event.target.value)} />
          </label>
          {registry.length > 0 ? (
            <p className="text-sm leading-6">
              Registry: <span className="font-mono text-xs">{registry.join(", ")}</span>
            </p>
          ) : null}
          <label className="block text-sm" htmlFor="pool">
            Pool id, optional
            <input id="pool" className="mt-1 min-h-11 w-full rounded-xl border border-line bg-cream px-3" value={pool} onChange={(event) => setPool(event.target.value)} />
          </label>
            </form>
          ) : (
            <p className="mt-3 text-base leading-7">Opening the sign form.</p>
          )}
        </div>
        {ready ? (
          <WriteBox
            title="Sign the submission"
            intent="Your wallet submits this object to the GenLayer contract. The server does not hold a key and cannot approve it."
            disabledReason={disabledReason}
            onSign={(update) => submitGenlayerWrite("submit_opportunity", [JSON.stringify(payload)], update)}
          />
        ) : null}
      </div>
    </Shell>
  );
}
