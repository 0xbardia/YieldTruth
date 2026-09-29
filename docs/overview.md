# Overview

YieldTruth answers one question: where does this yield come from, and does that source satisfy a structured allocation policy?

The path is:

1. A person submits a named opportunity and HTTPS evidence URLs on registered hosts.
2. GenLayer validators render those pages and classify the yield into a bounded schema.
3. Validators must agree under a domain-specific equivalence principle.
4. Contract code evaluates the classification against an immutable policy version.
5. The stored result is `APPROVED`, `REJECTED`, or `REVIEW_REQUIRED`.
6. A later assessment is a new revision. History is not rewritten. A stale window can make `satisfies` return review without changing the stored decision.

The desk explains the result in plain language and keeps the technical fields underneath.
