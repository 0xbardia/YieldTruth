# Security

## Reporting

Email security reports to the maintainers of the repository you cloned. Include the contract source hash, the network, and a minimal reproduction. Do not open a public issue that contains a working exploit against a deployed contract.

We will acknowledge receipt within 7 days when a maintainer is active. Please give us a reasonable window before public disclosure.

## What this project promises

- The model cannot choose the policy verdict.
- Web and user text are bounded before classification.
- Evidence URLs are HTTPS, have no userinfo or fragments, and must match an owner-registered hostname. IP literals are rejected.
- Extra JSON keys, unknown enums, and malformed model output fail closed to insufficient evidence.
- Writes are signed by the connected browser wallet.

## What it does not promise

This is an internal review, not a third-party audit, and not a "Gold" tier. See [report/SECURITY_FINDINGS.md](report/SECURITY_FINDINGS.md).

Consensus disagreement does not stop a prompt injection that every validator reads the same way. The contract therefore rejects unknown schema and applies policy in deterministic code after consensus.

Studionet deployment was not certified. Do not point production capital at an address from a failed `invalid_contract` receipt.
