import type { Decision, YieldComponent } from "./types";

export const COMPONENT_COPY: Record<YieldComponent, { title: string; plain: string }> = {
  ORGANIC_FEES: {
    title: "Trading or protocol fees",
    plain: "Most of this yield comes from fees paid by people using the market, not from a token incentive.",
  },
  LENDING_INTEREST: {
    title: "Borrower interest",
    plain: "Most of this yield comes from interest paid by borrowers.",
  },
  STAKING_REWARDS: {
    title: "Staking rewards",
    plain: "Most of this yield comes from staking issuance or validator rewards.",
  },
  TOKEN_SUBSIDY: {
    title: "Token incentives",
    plain: "Most of this yield currently comes from protocol token incentives rather than borrower interest or trading fees.",
  },
  LEVERAGED_YIELD: {
    title: "Leveraged yield",
    plain: "The return depends on borrowed exposure. Losses can exceed the advertised rate.",
  },
  RECURSIVE_YIELD: {
    title: "Recursive yield",
    plain: "The position deposits its own receipt back into the same loop. The yield is amplified, and so is the unwind risk.",
  },
  COUNTERPARTY_DEPENDENT: {
    title: "Counterparty-dependent",
    plain: "Getting paid depends on a specific custodian, issuer, or off-protocol party, not only on the market's own borrowers or traders.",
  },
  POINTS_SPECULATION: {
    title: "Points speculation",
    plain: "The advertised return is mostly an unissued points program, not cash yield.",
  },
  OTHER_VERIFIED: {
    title: "Other verified source",
    plain: "The evidence names a source that fits none of the standard buckets, and the classifier still marked it as verified.",
  },
  UNKNOWN: {
    title: "Source unknown",
    plain: "The evidence was not enough to say where the yield comes from.",
  },
};

export const DECISION_COPY: Record<Decision, string> = {
  APPROVED: "Fits the selected policy.",
  REJECTED: "Breaks a hard rule in the selected policy.",
  REVIEW_REQUIRED: "A person should look before capital moves.",
};

export const EVIDENCE_COPY: Record<string, string> = {
  SUFFICIENT: "Sufficient",
  INSUFFICIENT: "Not sufficient",
  CONFLICTING: "Sources disagree",
};

export const CONFIDENCE_COPY: Record<string, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const REASON_COPY: Record<string, string> = {
  POLICY_PASS: "No forbidden component was present, and the evidence cleared the policy's confidence bar.",
  TOKEN_SUBSIDY_FORBIDDEN: "Token incentives are in the yield, and this policy rejects them.",
  LEVERAGE_FORBIDDEN: "Leverage is in the yield, and this policy rejects it.",
  RECURSIVE_FORBIDDEN: "The yield is recursive, and this policy rejects that.",
  POINTS_FORBIDDEN: "The yield is points speculation, and this policy rejects that.",
  COUNTERPARTY_REVIEW: "A specific counterparty sits under the yield. This policy sends that to review rather than a silent yes.",
  INSUFFICIENT_EVIDENCE: "The evidence was not strong enough for a pass.",
  CONFLICTING_EVIDENCE: "The sources do not agree. This policy requires a person to look.",
  LOW_CONFIDENCE: "The classifier was not confident. This policy requires review.",
  STALE_ASSESSMENT: "The last assessment is older than the policy allows. The old verdict is kept, but the gate asks for a fresh one.",
  NO_ASSESSMENT: "Nothing has been assessed yet.",
  UNKNOWN_POLICY: "That policy is not on record.",
  EVIDENCE_NOT_SUFFICIENT: "The evidence state is not sufficient.",
};

/** Plain-language labels for the contract's risk flags. */
export const FLAG_COPY: Record<string, string> = {
  EMISSIONS_DOMINATED: "Most of the return depends on token emissions staying valuable",
  RECURSIVE_LEVERAGE: "The position is levered and recursive",
  POINTS_ONLY: "Mostly an unissued points programme",
  THIN_EVIDENCE: "The evidence is thin",
  SINGLE_SOURCE: "Only one source could be read",
  CONFLICTING_SOURCES: "The sources disagree",
  UNCLEAR_COUNTERPARTY: "The counterparty is not clear",
};

/**
 * Render a component/flag list the way a person reads it. The raw contract codes
 * are still available on the assessment record, but the narrative pages should not
 * print `LENDING_INTEREST` in the middle of an otherwise plain sentence.
 */
export function componentList(components: string[]): string {
  if (components.length === 0) return "none recorded";
  return components.map((item) => COMPONENT_COPY[item as YieldComponent]?.title ?? item).join(", ");
}

export function flagList(flags: string[]): string {
  if (flags.length === 0) return "none";
  return flags.map((item) => FLAG_COPY[item] ?? item).join(", ");
}

/** Human-readable assessment time. The contract stores a UTC ISO instant. */
export function assessedWhen(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  return `${new Date(parsed).toISOString().slice(0, 10)} at ${new Date(parsed).toISOString().slice(11, 16)} UTC`;
}
