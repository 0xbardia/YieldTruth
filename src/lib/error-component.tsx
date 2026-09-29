import type { ErrorComponentProps } from "@tanstack/react-router";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-6 text-center text-ink">
      <p className="text-xs tracking-[0.18em] text-rust uppercase">YieldTruth</p>
      <h1 className="text-3xl">Something went wrong</h1>
      <p className="max-w-md text-sm break-words">{errorMessage(error)}</p>
    </main>
  );
}
