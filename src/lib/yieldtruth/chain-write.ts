import { publicConfig } from "./public-config";

type Phase = "idle" | "review" | "wallet" | "submitted" | "consensus" | "final" | "failed";

type EthereumRequest = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export async function submitGenlayerWrite(
  functionName: string,
  args: string[],
  update: (phase: Phase, detail: string) => void,
) {
  const ethereum = (window as Window & { ethereum?: EthereumRequest }).ethereum;
  if (!ethereum) throw new Error("No browser wallet is available.");
  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  const chainHex = (await ethereum.request({ method: "eth_chainId" })) as string;
  const current = Number.parseInt(chainHex, 16);
  if (current !== publicConfig.chainId) {
    update("wallet", "Your wallet is on another network. Approve the switch to GenLayer Studionet in your wallet.");
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${publicConfig.chainId.toString(16)}` }],
      });
    } catch {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${publicConfig.chainId.toString(16)}`,
              chainName: "GenLayer Studionet",
              nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
              rpcUrls: [publicConfig.rpcUrl],
            },
          ],
        });
      } catch {
        // Both the switch and the add were declined. Say so plainly instead of
        // carrying on into a signature that cannot succeed.
        throw new Error(
          "GenLayer Studionet is not in your wallet and the switch was declined. Add or select that network, then try again. Nothing was sent.",
        );
      }
    }
  }
  update("wallet", "Waiting for your signature in the wallet.");
  const { createClient } = await import("genlayer-js");
  const { studionet } = await import("genlayer-js/chains");
  const { ExecutionResult, TransactionStatus, TransactionResult } = await import("genlayer-js/types");
  const client = createClient({
    chain: studionet,
    account: accounts[0] as `0x${string}`,
    provider: ethereum,
  });
  const hash = await client.writeContract({
    address: publicConfig.contractAddress as `0x${string}`,
    functionName,
    args,
    value: 0n,
  });
  const tx = String(hash) as `0x${string}` & { length: 66 };
  update("submitted", tx);
  update("consensus", `Sent as ${short(tx)}. Waiting for GenLayer validators to agree. This usually takes a minute or two.`);
  const receipt = await client.waitForTransactionReceipt({
    hash: tx,
    status: TransactionStatus.FINALIZED,
    interval: 3000,
    retries: 100,
  });
  const studio = receipt as typeof receipt & { result_name?: string };
  const agreedName = studio.resultName ?? studio.result_name;
  const agreedCode = receipt.result === undefined || receipt.result === null ? undefined : Number(receipt.result);
  const agreed =
    agreedName === TransactionResult.AGREE ||
    agreedName === TransactionResult.MAJORITY_AGREE ||
    agreedCode === 1 ||
    agreedCode === 6;
  const leaders = receipt.consensus_data?.leader_receipt ?? [];
  const primary = leaders.filter((row) => row.vote == null);
  const leaderFailed = primary.some((row) => row.execution_result && row.execution_result !== "SUCCESS");
  const executionFailed =
    receipt.txExecutionResultName !== undefined &&
    receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN;
  if (!agreed || leaderFailed || executionFailed) {
    // Say what happened and what it means. The raw consensus codes are for the
    // contract log, not for someone who just signed something.
    const outcome = agreed
      ? "the validators did not all agree"
      : leaderFailed
        ? "the contract reported an error while running"
        : "the contract did not finish cleanly";
    throw new Error(
      `Transaction ${short(tx)} reached the chain but ${outcome}, so nothing was stored. The hash is on GenLayer Studio if you want the detail. You can try again.`,
    );
  }
  update("final", `Finalized as ${short(tx)}. The desk is reloading the result now.`);
}

/** First and last few characters, so a hash stays readable in a sentence. */
function short(hash: string): string {
  return hash.length <= 18 ? hash : `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}
