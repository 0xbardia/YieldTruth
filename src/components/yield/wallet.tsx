import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectButton, RainbowKitProvider, getDefaultConfig, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider, createConfig, http, useChainId } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";
import { publicConfig } from "@/lib/yieldtruth/public-config";
import "@rainbow-me/rainbowkit/styles.css";

const studionetChain = defineChain({
  id: publicConfig.chainId,
  name: "GenLayer Studionet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: { default: { http: [publicConfig.rpcUrl] } },
  blockExplorers: { default: { name: "Studio", url: "https://studio.genlayer.com" } },
  testnet: true,
});

const projectId = publicConfig.walletConnectProjectId;
const wagmiConfig = projectId
  ? getDefaultConfig({
      appName: "YieldTruth",
      projectId,
      chains: [studionetChain],
      ssr: true,
    })
  : createConfig({
      chains: [studionetChain],
      connectors: [injected()],
      transports: { [studionetChain.id]: http(publicConfig.rpcUrl) },
      ssr: true,
    });

const queryClient = new QueryClient();

export function WalletProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#0f9d58",
            accentColorForeground: "#fffcf7",
            borderRadius: "medium",
            fontStack: "system",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function WalletLive({ autoOpen = false }: { autoOpen?: boolean }) {
  return (
    <WalletProviders>
      <WalletControl autoOpen={autoOpen} />
    </WalletProviders>
  );
}

function OpenOnce({ open, run }: { open: boolean; run: () => void }) {
  const done = useRef(false);
  useEffect(() => {
    if (!open || done.current) return;
    done.current = true;
    run();
  }, [open, run]);
  return null;
}

export function WalletControl({ autoOpen = false }: { autoOpen?: boolean }) {
  const chainId = useChainId();
  const wrong = chainId !== publicConfig.chainId;
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openChainModal, mounted }) => {
        const ready = mounted && account;
        return (
          <>
            <OpenOnce open={autoOpen && Boolean(mounted)} run={openConnectModal} />
            {!ready ? (
              <button type="button" className="btn btn-solid px-4 text-sm" onClick={openConnectModal}>
                Connect
              </button>
            ) : chain?.unsupported || wrong ? (
              <button type="button" className="btn btn-glass px-3 text-sm text-rust" onClick={openChainModal}>
                Wrong network
              </button>
            ) : (
              <button type="button" className="btn btn-glass px-3 font-mono text-xs" onClick={openChainModal}>
                {account.displayName}
              </button>
            )}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
}
