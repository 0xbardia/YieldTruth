import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/yield/shell";
import { publicConfig } from "@/lib/yieldtruth/public-config";

export const Route = createFileRoute("/docs")({ component: DocsPage });

function DocsPage() {
  return (
    <Shell>
      <article className="desk-wrap max-w-3xl py-12">
        <div className="sheet p-6 md:p-10">
        <p className="kicker">Documentation</p>
        <h1 className="mt-2 text-5xl">How to use the desk</h1>
        <p className="mt-4 text-lg leading-8">
          Start with a labelled example if you want to learn the language. Sign a write only when a contract address is configured, and only from your own wallet.
        </p>

        <h2 className="mt-10 text-3xl">If you allocate capital</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 leading-7">
          <li>Open Explore and read the source in words, not just the rate.</li>
          <li>Open the evidence links. Those are the only pages validators are allowed to read.</li>
          <li>Read the policy as a sentence. The sentence is generated from switches, so there is no hidden clause.</li>
          <li>Connect the wallet in this browser. YieldTruth does not ask you to paste a seed or a private key.</li>
          <li>On the sign screen, review the call, then approve it in the wallet.</li>
          <li>Wait until the status says final. A hash by itself is not a decision.</li>
          <li>Come back later. Drift keeps the earlier reading beside the new one.</li>
        </ol>

        <h2 className="mt-10 text-3xl">How a write is signed</h2>
        <p className="mt-3 leading-7">
          The button calls <span className="font-mono text-sm">genlayer-js</span> <span className="font-mono text-sm">writeContract</span> with the account your wallet just exposed. The library uses that injected provider. There is no server-side signer, and the read API cannot approve, reject, or move funds.
        </p>
        <p className="mt-3 break-all leading-7">
          {publicConfig.contractAddress
            ? `This desk is pointed at Studionet ${publicConfig.contractAddress}. The button still sends the call to your wallet. It does not sign on the server.`
            : "If the contract address is empty, the button stays disabled. That is a safety stop, not a missing feature. Reads of the public desk still work."}
        </p>
        <p className="mt-3">
          <Link to="/opportunities/new" className="underline underline-offset-4">Open the sign screen</Link>
        </p>

        <h2 className="mt-10 text-3xl">If you are integrating</h2>
        <p className="mt-3 leading-7">
          The Python contract is the authority. The HTTP API is a public index of the same records. It will not invent a verdict, and it will not accept a write.
        </p>
        <ul className="mt-3 space-y-2 font-mono text-sm leading-7">
          <li>GET /api/v1/health/live</li>
          <li>GET /api/v1/health/ready</li>
          <li>GET /api/v1/config</li>
          <li>GET /api/v1/opportunities</li>
          <li>GET /api/v1/opportunities/:id</li>
          <li>GET /api/v1/opportunities/:id/assessments</li>
          <li>GET /api/v1/assessments/:id</li>
          <li>GET /api/v1/policies</li>
          <li>GET /api/v1/policies/:id</li>
          <li>GET /api/v1/sources</li>
          <li>GET /api/v1/activity</li>
        </ul>
        <p className="mt-4 leading-7">
          The longer method notes live on the <Link className="underline underline-offset-4" to="/methodology">methodology</Link> page. The build order is the <Link className="underline underline-offset-4" to="/roadmap">roadmap</Link>.
        </p>
        </div>
      </article>
    </Shell>
  );
}
