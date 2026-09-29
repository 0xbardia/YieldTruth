import { createServerFn } from "@tanstack/react-start";

async function catchUp() {
  const { catchUpFromChain } = await import("./chain-sync.server");
  return catchUpFromChain({ wait: false });
}

export const fetchOpportunities = createServerFn({ method: "GET" }).handler(async () => {
  await catchUp();
  const { listOpportunities } = await import("./repo.server");
  return listOpportunities();
});

export const fetchOpportunity = createServerFn({ method: "GET" })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    await catchUp();
    const { getOpportunity, listAssessments } = await import("./repo.server");
    const opportunity = await getOpportunity(data.id);
    if (!opportunity) return null;
    const assessments = await listAssessments(data.id);
    return { opportunity, assessments };
  });

export const fetchPolicies = createServerFn({ method: "GET" }).handler(async () => {
  await catchUp();
  const { listPolicies } = await import("./repo.server");
  return listPolicies();
});

export const fetchPolicy = createServerFn({ method: "GET" })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    await catchUp();
    const { getPolicy } = await import("./repo.server");
    return getPolicy(data.id);
  });

export const fetchActivity = createServerFn({ method: "GET" }).handler(async () => {
  await catchUp();
  const { listActivity } = await import("./repo.server");
  return listActivity();
});

export const fetchSources = createServerFn({ method: "GET" }).handler(async () => {
  await catchUp();
  const { listSources } = await import("./repo.server");
  return listSources();
});

export const fetchGate = createServerFn({ method: "GET" })
  .validator((input: { opportunityId: number; policyId: number }) => input)
  .handler(async ({ data }) => {
    const { explainGate } = await import("./repo.server");
    return explainGate(data.opportunityId, data.policyId);
  });

export const fetchExplore = createServerFn({ method: "GET" }).handler(async () => {
  const { catchUpFromChain } = await import("./chain-sync.server");
  const sync = await catchUpFromChain({ wait: false });
  const { listAssessments, listOpportunities, listPolicies } = await import("./repo.server");
  const [opportunities, policies] = await Promise.all([listOpportunities(), listPolicies()]);
  const rows = [];
  for (const opportunity of opportunities) {
    const history = await listAssessments(opportunity.id);
    rows.push({ opportunity, latest: history.at(-1) ?? null });
  }
  return { rows, policies, syncError: sync.error ?? "" };
});

export const fetchConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { publicConfigPayload } = await import("./config");
  return publicConfigPayload();
});
