import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { publicConfig } from "@/lib/yieldtruth/public-config";

type Phase = "idle" | "review" | "wallet" | "submitted" | "consensus" | "final" | "failed";

const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

export function WriteBox({
  title,
  intent,
  disabledReason,
  onSign,
}: {
  title: string;
  intent: string;
  disabledReason?: string;
  onSign: (update: (phase: Phase, detail: string) => void) => Promise<void>;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState("");
  const hash = TX_HASH.test(detail) ? detail : "";

  async function sign() {
    setPhase("wallet");
    setDetail("Confirm the network, then sign in your wallet. YieldTruth never signs for you.");
    try {
      await onSign((next, message) => {
        setPhase(next);
        setDetail(message);
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
      setDetail(error instanceof Error ? error.message : "The write did not finish.");
    }
  }

  return (
    <section className="slip p-5" aria-live="polite">
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-6">{intent} genlayer-js sends <span className="font-mono">writeContract</span> to the wallet in this browser. No server key is involved.</p>
      {!publicConfig.contractAddress ? (
        <p className="mt-4 text-sm text-rust">
          No contract address is configured, so this button stays closed. Reads still work. A write would be signed by your wallet, not by a server key.
        </p>
      ) : null}
      {disabledReason ? <p className="mt-3 text-sm">{disabledReason}</p> : null}
      <button
        type="button"
        className="btn btn-solid press mt-4 disabled:opacity-50"
        disabled={Boolean(disabledReason) || !publicConfig.contractAddress || phase === "wallet" || phase === "consensus"}
        onClick={() => {
          setPhase("review");
          void sign();
        }}
      >
        Review and sign
      </button>
      <p className="mt-3 font-mono text-xs break-all">
        Status: {phase}
        {detail ? ` — ${detail}` : ""}
      </p>
      {phase === "final" && hash ? (
        <p className="mt-3 text-sm leading-6">
          Final is not the same as approved. The desk is reloading the index. Look this hash up on{" "}
          <a className="underline" href="https://studio.genlayer.com/contracts" rel="noreferrer" target="_blank">
            GenLayer Studio
          </a>
          .
        </p>
      ) : null}
    </section>
  );
}