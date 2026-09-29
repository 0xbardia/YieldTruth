import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { Shell } from "@/components/yield/shell";
import { routeTree } from "./routeTree.gen";

function PendingPage() {
  return (
    <Shell>
      <p className="desk-wrap py-16 text-lg">Opening this page.</p>
    </Shell>
  );
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultPendingComponent: PendingPage,
    defaultPendingMs: 120,
    defaultPendingMinMs: 200,
  });
}
