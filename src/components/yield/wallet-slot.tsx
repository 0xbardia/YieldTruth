import { lazy, Suspense, useEffect, useState } from "react";

const WalletLive = lazy(() => import("./wallet").then((mod) => ({ default: mod.WalletLive })));

export function WalletSlot() {
  const [live, setLive] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);

  useEffect(() => {
    const start = () => setLive(true);
    const idle = window.requestIdleCallback;
    if (typeof idle === "function") {
      const id = idle(start, { timeout: 1600 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(start, 400);
    return () => window.clearTimeout(id);
  }, []);

  if (!live) {
    return (
      <button
        type="button"
        className="btn btn-solid px-4 text-sm"
        onClick={() => {
          setAutoOpen(true);
          setLive(true);
        }}
      >
        Connect
      </button>
    );
  }

  return (
    <Suspense fallback={<button type="button" className="btn btn-solid px-4 text-sm" disabled>Connect</button>}>
      <WalletLive autoOpen={autoOpen} />
    </Suspense>
  );
}
