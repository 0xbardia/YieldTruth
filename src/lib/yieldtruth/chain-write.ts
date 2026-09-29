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
    update("wallet", "Switching to GenLayer Studionet.");
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${publicConfig.chainId.toString(16)}` }],
      });
    } catch {
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
    }
  }
  update("wallet", "Waiting for your signature.");
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
  update("consensus", `${tx} is with validators.`);
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
    throw new Error(
      `${tx} is not an agreed result (${agreedName ?? agreedCode ?? "unknown"} / ${receipt.txExecutionResultName ?? "no execution field"}).`,
    );
  }
  update("final", tx);
}
