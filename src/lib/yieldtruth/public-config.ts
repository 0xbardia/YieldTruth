export const publicConfig = {
  network: import.meta.env.VITE_GENLAYER_NETWORK || "studionet",
  rpcUrl: import.meta.env.VITE_GENLAYER_RPC_URL || "https://studio.genlayer.com/api",
  chainId: Number(import.meta.env.VITE_GENLAYER_CHAIN_ID || 61999),
  contractAddress: import.meta.env.VITE_YIELDTRUTH_CONTRACT_ADDRESS || "",
  walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
};

export const STUDIO_CHAIN_ID = 61999;
