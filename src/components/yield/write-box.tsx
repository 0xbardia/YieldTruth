import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { publicConfig } from "@/lib/yieldtruth/public-config";
import { explainWriteError } from "@/lib/yieldtruth/write-errors";

type Phase = "idle" | "review" | "wallet" | "submitted" | "consensus" | "final" | "failed";

const TX_HASH = /0x[0-9a-fA-F]{64}/;

/** What the wallet is about to be asked to sign, in the user's terms. */
export function WriteBox({
  title,
  intent,
  /** Named subject of the write, e.g. the opportunity or policy being created. */
  subject,
  disabledReason,
  onSign,
}: {
  title: string;
  intent: string;
  subject: string;
  disabledReason?: string;
  onSign: (update: (phase: Phase, detail: string) => void) => Promise<void>;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState("");
  // The hash is tracked as its own piece of state rather than recovered from the
  // status sentence. The status text is written for a person and uses a shortened
  // hash for readability, so a whole-string match silently lost the link to the
  // transaction the moment the copy was improved.
  const [txHash, setTxHash] = useState("");

  async function sign() {
    setPhase("wallet");
    setDetail("Confirm the network, then sign in your wallet. YieldTruth never signs for you.");
    try {
      await onSign((next, message) => {
        setPhase(next);
        setDetail(message);
        const found = message.match(TX_HASH)?.[0];
        if (found) setTxHash(found);
        if (next === "final") {
          void fetch("/api/v1/activity")
            .catch(() => undefined)
            .finally(() => {
              void router.invalidate();
            });
        }
      });
    } catch (error) {
      setPhase("failed");
      setDetail(explainWriteError(error));
    }
  }

  const waiting = phase === "wallet" || phase === "consensus" || phase === "submitted";
  const locked = Boolean(disabledReason) || !publicConfig.contractAddress || waiting;
  // A failed write is terminal for that attempt; the button must come back so the
  // user has a way to retry rather than a dead control.
  const phaseLine = phase === "idle" ? "Status: idle" : `Status: ${phase}${detail ? ` — ${detail}` : ""}`;

  return (
    <section className="slip p-5" aria-live="polite">
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-6">{intent} You sign this from your own wallet in this browser. The server never holds a wallet key.</p>
      {!publicConfig.contractAddress ? (
        <p className="mt-4 text-sm text-rust">
          No contract address is configured, so this button stays closed. Reads still work. A write would be signed by your wallet, not by a server key.
        </p>
      ) : null}
      {disabledReason ? <p className="mt-3 text-sm">{disabledReason}</p> : null}

      <dl className="mt-4 space-y-2 border-y border-line py-3 text-sm">
        <div className="flex gap-3">
          <dt className="shrink-0 text-xs tracking-widest uppercase">You are signing</dt>
          <dd className="leading-6">{subject}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="shrink-0 text-xs tracking-widest uppercase">This will</dt>
          <dd className="leading-6">Write a permanent record on GenLayer Studionet. It cannot be undone or deleted afterwards.</dd>
        </div>
        <div className="flex gap-3">
          <dt className="shrink-0 text-xs tracking-widest uppercase">Then</dt>
          <dd className="leading-6">GenLayer validators read the evidence and agree on the source of yield. That usually takes a minute or two, and sometimes longer.</dd>
        </div>
        <div className="flex gap-3">
          <dt className="shrink-0 text-xs tracking-widest uppercase">Not a promise</dt>
          <dd className="leading-6">This does not guarantee an approval. The validators decide the source, and the policy decides the result.</dd>
        </div>
      </dl>

      <button type="button" className="btn btn-solid press mt-4 disabled:opacity-50" disabled={locked} onClick={() => { setPhase("review"); void sign(); }}>
        Review and sign
      </button>
      <p className="mt-3 text-sm leading-6 break-words">{phaseLine}</p>
      {phase === "failed" ? (
        <p className="mt-2 text-sm leading-6">Nothing was written to the contract. The button above is ready if you want to try again.</p>
      ) : null}
      {phase === "final" && txHash ? (
        <div className="mt-3 text-sm leading-6">
          <p>
            Final is not the same as approved. Validators agreed on the source of yield; the policy still decides
            whether money may follow it. The desk is reloading that result now.
          </p>
          <p className="mt-2 font-mono text-xs break-all">{txHash}</p>
          <p className="mt-1">
            Look the transaction up on{" "}
            <a className="underline" href="https://studio.genlayer.com/contracts" rel="noreferrer" target="_blank">
              GenLayer Studio
            </a>
            .
          </p>
        </div>
      ) : null}
    </section>
  );
}
