import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/yield/shell";
import { publicConfig } from "@/lib/yieldtruth/public-config";

export const Route = createFileRoute("/")({ component: Home });

const STEPS = [
  ["Name the market", "A protocol, an asset, and a handful of public pages. Not a free-form prompt."],
  ["Read the evidence", "Only HTTPS pages on hosts the contract already trusts."],
  ["Agree on the source", "GenLayer validators classify where the yield comes from. They do not vote yes or no."],
  ["Apply your policy", "Structured rules decide approved, rejected, or needs review. The model cannot write that line."],
];

const PHASES = [
  ["Now", "Classification, policies, labelled records, and a wallet-signed write path."],
  ["Next", "Scheduled re-reads and a plain alert when the source of yield changes."],
  ["Then", "A small SDK so a vault can consume a finalized assessment."],
  ["Later", "Policy-gated capital routing. Not built, and not implied."],
];

function Home() {
  return (
    <Shell>
      <section className="desk-wrap grid items-center gap-10 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
        <div>
          <p className="rise kicker inline-flex items-center gap-2">
            <img src="/logo.svg" alt="" width={22} height={22} className="h-5 w-5" />
            For people who allocate capital
          </p>
          <h1 className="rise d1 mt-3 max-w-xl text-5xl text-ink sm:text-6xl">Don’t ask how high the yield is.</h1>
          <p className="rise d2 mt-5 max-w-xl text-xl leading-8 text-ink">
            Ask what is actually paying you. YieldTruth names the source. Your policy, not a language model, decides whether money may follow it.
          </p>
          <div className="rise d3 mt-8 flex flex-wrap gap-3">
            <Link to="/explore" className="btn btn-solid press">
              Inspect a market
            </Link>
            <a href="#signing" className="btn btn-glass press">
              How your wallet signs
            </a>
          </div>
        </div>
        <aside className="rise d4 slip sheen p-6" aria-label="Sample allocation slip">
          <p className="text-sm font-semibold text-amber">Sample slip · fixture, not a live reading</p>
          <h2 className="mt-2 text-3xl">Aave v3 WETH supply</h2>
          <p className="mt-3 text-base leading-7">Most of this teaching record is interest paid by borrowers, not a token incentive.</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl bg-white/45 p-3">
              <dt className="text-muted">Primary source</dt>
              <dd className="mt-1 font-semibold">Lending interest</dd>
            </div>
            <div className="rounded-2xl bg-white/45 p-3">
              <dt className="text-muted">Policy</dt>
              <dd className="mt-1 font-semibold">Desk conservative</dd>
            </div>
          </dl>
          <p className="stamp mt-6 text-canopy">Approved by policy</p>
          <p className="mt-4 text-sm leading-6 text-muted">This card is a labelled example. Explore marks every fixture the same way.</p>
        </aside>
      </section>

      <section className="desk-wrap">
        <div className="sheet grid gap-8 p-6 md:grid-cols-3 md:p-8">
          <div>
            <h2 className="text-2xl">Plain language</h2>
            <p className="mt-2 text-base leading-7">“Borrower interest” is easier to trust than a ticker and a percentage.</p>
          </div>
          <div>
            <h2 className="text-2xl">Your key stays yours</h2>
            <p className="mt-2 text-base leading-7">Writes are signed in the browser with genlayer-js. The server never holds a wallet key.</p>
          </div>
          <div>
            <h2 className="text-2xl">History is not rewritten</h2>
            <p className="mt-2 text-base leading-7">When a market drifts from interest into incentives, the old reading stays on the record.</p>
          </div>
        </div>
      </section>

      <section className="desk-wrap py-14">
        <h2 className="text-4xl">What happens before money moves</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-2">
          {STEPS.map(([title, body], index) => (
            <li key={title} className="slip p-5">
              <p className="kicker">Step {index + 1}</p>
              <h3 className="mt-2 text-2xl">{title}</h3>
              <p className="mt-2 text-base leading-7">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="signing" className="desk-wrap pb-4">
        <div className="sheet grid gap-8 p-6 md:p-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="text-4xl">The signature is yours</h2>
            <p className="mt-4 text-lg leading-8">
              Connecting a wallet is not a login to our server. When you submit a market or ask for a new reading, genlayer-js calls your browser wallet. You see the function name and the arguments, then you sign. If there is no injected wallet, nothing is sent.
            </p>
            <Link to="/opportunities/new" className="btn btn-ink press mt-6">
              Open the sign screen
            </Link>
          </div>
          <ol className="slip space-y-4 p-6">
            <li><strong>1. Connect.</strong> RainbowKit talks to the wallet already in this browser.</li>
            <li><strong>2. Review.</strong> The screen names the contract call before anything is broadcast.</li>
            <li><strong>3. Sign.</strong> <span className="font-mono text-sm">writeContract</span> uses your account, never a key stored on the server.</li>
            <li><strong>4. Wait.</strong> A transaction hash is not a verdict. The status has to say final.</li>
            <li className="break-all text-sm text-muted">
              {publicConfig.contractAddress ? (
                <>
                  Studionet contract{" "}
                  <a className="underline" href="https://studio.genlayer.com/contracts" rel="noreferrer" target="_blank">
                    {publicConfig.contractAddress}
                  </a>
                  . The wallet in this browser still has to sign.
                </>
              ) : (
                "The sign button stays closed until a real Studionet contract address is configured. That is deliberate."
              )}
            </li>
          </ol>
        </div>
      </section>

      <section className="desk-wrap grid gap-6 py-14 lg:grid-cols-2">
        <div className="slip p-6 md:p-8">
          <h2 className="text-4xl">Why the model does not get the vote</h2>
          <p className="mt-4 text-lg leading-8">
            Validators can agree and still be wrong if they all read the same poisoned page. Pages are treated as data. The classifier may return a source, a confidence, and one short sentence. After they agree, ordinary code applies your policy. An instruction hidden in a webpage cannot mint an approval.
          </p>
          <Link to="/methodology" className="mt-4 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
            Read the method
          </Link>
        </div>
        <div className="slip p-6 md:p-8">
          <h2 className="text-4xl">Yield changes its story</h2>
          <p className="mt-4 text-lg leading-8">
            A market that was borrower interest in spring can be mostly token incentives by autumn. Reassessment adds a new revision. The gate reads the latest one. The history shows what changed.
          </p>
          <Link to="/opportunities/$id/drift" params={{ id: "9003" }} className="mt-4 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
            See a teaching example of drift
          </Link>
        </div>
      </section>

      <section className="desk-wrap pb-4">
        <div className="sheet p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-4xl">Where this is going</h2>
            <Link to="/roadmap" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
              Full roadmap
            </Link>
          </div>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PHASES.map(([when, body]) => (
              <li key={when} className="rounded-2xl border border-white/70 bg-white/40 p-4">
                <p className="kicker">{when}</p>
                <p className="mt-2 text-base leading-7">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </Shell>
  );
}
