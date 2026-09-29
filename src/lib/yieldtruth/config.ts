const NETWORKS = ["studionet", "localnet", "testnet-asimov", "testnet-bradbury"] as const;
export type GenLayerNetworkName = (typeof NETWORKS)[number];

function read(name: string, fallback = ""): string {
  const raw = process.env[name];
  return raw === undefined ? fallback : raw.trim();
}

function intEnv(name: string, fallback: number): number {
  const raw = read(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
  return value;
}

const network = read("GENLAYER_NETWORK", read("VITE_GENLAYER_NETWORK", "studionet"));
if (!NETWORKS.includes(network as GenLayerNetworkName)) {
  throw new Error(`GENLAYER_NETWORK must be one of ${NETWORKS.join(", ")}`);
}

const chainId = intEnv("GENLAYER_CHAIN_ID", intEnv("VITE_GENLAYER_CHAIN_ID", 61999));
if (network === "studionet" && chainId !== 61999) {
  throw new Error("studionet chain id must be 61999");
}

export const serverConfig = {
  nodeEnv: read("NODE_ENV", "development"),
  appUrl: read("APP_URL", "http://127.0.0.1:8080"),
  logLevel: read("LOG_LEVEL", "info"),
  network: network as GenLayerNetworkName,
  rpcUrl: read("GENLAYER_RPC_URL", read("VITE_GENLAYER_RPC_URL", "https://studio.genlayer.com/api")),
  chainId,
  contractAddress: read("GENLAYER_CONTRACT_ADDRESS", read("VITE_YIELDTRUTH_CONTRACT_ADDRESS", "")),
  corsOrigins: read("CORS_ORIGINS")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  rateLimitMax: intEnv("RATE_LIMIT_MAX", 120),
  rateLimitWindowMs: intEnv("RATE_LIMIT_WINDOW_MS", 60_000),
};

export function publicConfigPayload() {
  return {
    network: serverConfig.network,
    rpcUrl: serverConfig.rpcUrl,
    chainId: serverConfig.chainId,
    contractAddress: serverConfig.contractAddress,
    contractConfigured: serverConfig.contractAddress.length > 0,
  };
}
