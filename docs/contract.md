# Contract

File: `contracts/yield_truth.py`  
Class: `YieldTruth(gl.Contract)`  
Runner header: line 1 is `# v0.1.0`. Line 2 is the only Depends comment, `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`.  
Any other comment between those two lines is parsed as runner JSON and Studionet returns `invalid_contract`.

## Consensus

`assess` snapshots storage, then calls `gl.vm.run_nondet`. The leader and each validator render pages with `gl.nondet.web.render(url, mode="text")` and classify with `gl.nondet.exec_prompt(..., response_format="json")`. There is no direct HTTP client. The validator re-runs that work and compares the JSON in Python. `gl.eq_principle.prompt_comparative` is not used, so a node operator's comparative template cannot accept a different component set.

The principle (`YIELDTRUTH_EQ_V1`) requires exact agreement on schema version, evidence state, primary component, component set, risk-flag set, confidence, and source counts. Rationale wording may differ. There is no verdict field.

After consensus, `_coerce_model` rejects extra keys, unknown enums, and overlong rationale. Zero readable sources cannot be sufficient. One source cannot stay at `HIGH` confidence. `evaluate_policy` then chooses the decision. The model output is not allowed to carry one.

## Policy

Policies are created from an exact JSON key set. Unknown keys revert. Policies are not updated or deleted. A new version is a new id.

Controls: token subsidy, leverage, recursive yield, points, counterparty review, low confidence, conflicting evidence, max age. Age `0` disables the freshness check. Staleness is applied by `satisfies` against the current transaction time. The stored assessment is left intact.

Counterparty-dependent yield requires review when the policy disallows it. It is not an automatic rejection. Subsidy, leverage, recursive yield, and points are rejections when disallowed.

## Evidence URLs

HTTPS only. No userinfo, no fragments, no ports, no localhost or `.local` / `.internal`, no IP-shaped host (including public literals). The host must be enabled in the owner registry. Duplicate URL or duplicate host in one submission is rejected. At most four URLs. Evidence text is ASCII-collapsed and capped before the prompt, inside delimiters that say the content is data.

## Admin

`register_source` and `disable_source` are owner-only. Re-registering enables the host again. Other writes are open to the signing account and do not change the owner, the registry, or existing policies.

## Reads

`schema_version`, `get_owner`, `classification_charter`, `equivalence_principle`, `get_limits`, `source_count`, `get_source`, `list_sources`, `get_policy_count`, `get_policy`, `list_policies`, `get_opportunity_count`, `get_opportunity`, `list_opportunities`, `get_assessment_count`, `get_assessment`, `get_latest_assessment`, `get_history`, `get_latest_decision`, `satisfies`.

Views return JSON strings. Counts are strings so they do not shadow storage fields.

## Storage bounds

500 policies, 500 opportunities, 20 revisions, 64 sources. Rationale 280 characters. Components and flags capped at 6.
