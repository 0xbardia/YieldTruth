/**
 * Turn a wallet or library failure into something a first-time user can act on.
 *
 * Raw viem/RPC text ("Details: … Version: viem@2.56.9") is not a user-facing
 * error: it names no cause and no next step, and it makes a working product look
 * broken. Known cases get a plain sentence; anything else is summarised with the
 * library version stripped.
 *
 * Kept in its own module (rather than inside the component) so the copy is
 * directly testable without rendering React.
 */
export function explainWriteError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const code = (error as { code?: number })?.code;

  // Our own chain-write messages are already written for a person. Check them
  // first so a phrase like "the switch was declined" is not re-interpreted as a
  // generic wrong-network error. They always quote a real hash, so require one:
  // the SDK's own "Transaction null not found" starts with the same word.
  if (/^(Transaction|Sent as|Finalized as) 0x/i.test(message)) return message;
  if (/^GenLayer Studionet is not in your wallet/i.test(message)) return message;

  if (code === 4001 || /user (rejected|denied)|denied transaction/i.test(message)) {
    return "You rejected the signature in your wallet, so nothing was sent. You can change your mind and try again.";
  }
  if (code === -32002 || /already pending|request of type.*pending/i.test(message)) {
    return "Your wallet already has a request waiting. Open the wallet and finish or dismiss it, then try again.";
  }
  if (/not found|404/i.test(message) && /transaction/i.test(message)) {
    return "Your wallet sent a transaction the network could not find. It may still be propagating — wait a moment and reload before trying again.";
  }
  if (/unsupported chain|switch|chain id/i.test(message)) {
    return "Your wallet is on a different network. Switch it to GenLayer Studionet and try again.";
  }
  if (/rate limit|429/i.test(message)) {
    return "The GenLayer network is busy and rate-limited us. Nothing was sent. Wait a minute and try again.";
  }
  if (/failed to fetch|network|timeout|econn/i.test(message)) {
    return "The connection to GenLayer failed. Nothing was sent. Check your network and try again.";
  }
  const firstLine = message.split("\n")[0].trim();
  return firstLine
    ? `${firstLine.replace(/\s*Version:\s*viem@[\d.]+\.?$/i, "").trim()}. You can try again.`
    : "The write did not finish. You can try again.";
}
