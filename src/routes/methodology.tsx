import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/yield/shell";

export const Route = createFileRoute("/methodology")({ component: MethodPage });

function MethodPage() {
  return (
    <Shell>
      <article className="desk-wrap max-w-3xl py-10 leading-7">
        <div className="sheet p-6 md:p-10">
        <p className="kicker">Methodology</p>
        <h1 className="mt-2 text-5xl">What “source of yield” means</h1>
        <p className="mt-4">
          YieldTruth does not rank APY. It asks which economic activity pays the depositor. The allowed answers are a closed set: fees, borrower interest, staking rewards, token subsidies, leverage, recursive loops, counterparty dependence, points, another verified source, or unknown.
        </p>
        <h2 className="mt-8 text-3xl">Two stages</h2>
        <p className="mt-3">
          Stage one is semantic and runs inside a GenLayer intelligent contract. Validators render trusted pages with <span className="font-mono text-sm">gl.nondet.web.render</span> and classify them inside <span className="font-mono text-sm">gl.vm.run_nondet</span>. Equivalence is ordinary code: the primary source, the component set, the risk flags, the evidence state, the confidence, and the source counts must match. Wording of the rationale may differ. A model does not decide that match, and it is not given a field for the policy verdict.
        </p>
        <p className="mt-3">
          Stage two is ordinary code. It reads that classification plus a structured policy and returns approved, rejected, or review required. The model is not given a field for that verdict. If it tries to add one, the assessment fails closed to insufficient evidence.
        </p>
        <h2 className="mt-8 text-3xl">Evidence rules</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>HTTPS only. No userinfo, fragments, localhost, or literal private IPs.</li>
          <li>The host must be on the owner’s registry and still enabled.</li>
          <li>Zero readable sources cannot be sufficient.</li>
          <li>One readable source cannot be high confidence.</li>
          <li>A failed source does not erase the others if at least one page was read. It also does not create high confidence by itself.</li>
          <li>Conflicting evidence stays conflicting if the policy says that needs a person.</li>
        </ul>
        <p className="mt-3">
          If validators do not agree, nothing is stored. An appeal, when the network offers one, is the Studionet window on that transaction. This contract has no appeal method and it does not move capital.
        </p>
        <h2 className="mt-8 text-3xl">What a fixture is</h2>
        <p className="mt-3">
          Rows marked fixture are teaching records stored in the product database so the desk is understandable before a Studionet deployment is connected. They are not presented as live protocol data or as validator consensus.
        </p>
        </div>
      </article>
    </Shell>
  );
}
