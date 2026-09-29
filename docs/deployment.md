# Deployment

## Target network

| | |
|---|---|
| Name | studionet |
| Chain id | 61999 (`0xf22f`, confirmed by `eth_chainId`) |
| RPC | `https://studio.genlayer.com/api` |
| SDK | genlayer-js 1.1.8 |
| Contract | `0x23C029E1aB24f74b355EF05f7b540296BEdD6279` |
| Studio | https://studio.genlayer.com/contracts |

Studio-dev (`61997`) was not used.

## Current deployment

| | |
|---|---|
| Deploy tx | `0x61a1d68664ddc707611eea2dc2221d95678bd5ad637351ba9ae0e8713b5f9d5f` |
| Status | FINALIZED, result `6` (`MAJORITY_AGREE`). Leader execution SUCCESS. Constructor reads succeed. |
| Source SHA-256 | `eef7fa511d79141f8da4786db777c86fba4c26082a71599833b8bdfb238c22f1` |
| Fix | Equivalence is `gl.vm.run_nondet` plus a Python field compare. `prompt_comparative` is not called. |

Browser writes on this address, signed in the page through `writeContract`, all `FINALIZED` / `MAJORITY_AGREE`:

| Call | Hash |
|---|---|
| `create_policy` | `0x019077e53f0ce0bb6221da7db124f39febf092f20b1fd1038e56d1e986c258cf` |
| `submit_opportunity` | `0xf29bf7b8ad3994d87cbcc9049b661d1477f363d59cb8bcc532b43a132bfd2bb2` |
| `assess` | `0xacd5ffc84280b348e59d63707bdc0f89aa1e7b6ab7e79efb9e7e99dee06dbae7` |

The assessment stored lending interest, two readable sources, and `APPROVED` / `POLICY_PASS`. The deployer key was ephemeral and was not written to disk.

The previous address `0xEeb187Db672ACc6e84792beDe64659b4e7Dcd30D` still classifies through `prompt_comparative`. Do not point the desk at it. The address before that, `0x83adE83ac66400895AcC9EB18A3828663aEF7711`, also rejected string schema versions.

## Deployed on 2026-09-26

Studionet rejected the contract while extra header comments were being parsed as runner JSON (`invalid_contract`, empty stderr). The fix is a version comment on line 1 and the Depends JSON as the only following comment.

| | |
|---|---|
| Deploy tx | `0x5bb1a9cfa434cb91a3b95356bdbfd06787d992d6ef57da15c79e15fc54940026` |
| Status | FINALIZED, MAJORITY_AGREE, leader execution SUCCESS |
| Source SHA-256 | `b39b1cbc110dfd9fc417e71ed5a6aaae1d16de5bdaa3440f01c66dcde645cf15` |

The deployer key was ephemeral and was not written to disk. `register_source` and `disable_source` remain owner-only, so those two admin calls cannot be repeated from this workspace. Open writes (`create_policy`, `submit_opportunity`, `assess`) do not need the owner.

## Writes exercised on that address

Ephemeral keys, not stored, not a browser wallet.

| Call | Hash | Result |
|---|---|---|
| `create_policy` | `0xc354a67d4c9d465efadf1895d26adbcad558744503043e2a116031931279ac3d` | SUCCESS |
| `submit_opportunity` | `0x42fcdd2b93a1751b5fc48a33a9843460e3f2d935696ae4d22ac72be0a75c4ad8` | SUCCESS |
| `register_source` by a non-owner | `0xb8428831291627c4715ed8e542a740e8282f7576de21ab846e95250e7dd46377` | rollback `not owner` |
| `assess` | `0x59366293885d9c3e3aba332ab3a92ae2bcb1777e1ae811acca6b6cfa9c662cb2` | SUCCESS, stored review because both pages failed to render |
| second `submit_opportunity` | `0x2268746335dc455ddbeebbaa4c29f511dad9270e56658fcc9bf8638c71e9ea11` | SUCCESS, opportunity 2 |
| second `assess` | `0x9bb5a4b57def6f68a867acc44702c6bd99455861f580aa6bb30355b679160c28` | CANCELED, `NO_MAJORITY`. Not a stored reading |

## Earlier failed attempts

Do not configure these.

| Try | Hash | Result |
|---|---|---|
| YieldTruth before the header fix | `0x265622bbd462a990d05e30b0441228c3a93ef0561e73ea94458472337cd569bb` | `invalid_contract` |
| Upstream v0.3.0 hello | `0x3a4d47bcd4299c80d163bc825c2cd4d6451942d65cc23b77d403996ad8a8eb87` | `invalid_contract` |
| Same hello as bytes | `0x91844a72701ea9057274d093e60e102e1c824047a8b8b7278f70dff4537ccae7` | `invalid_contract` |

## Application

`npm run build` produces the deployable output. `DATABASE_URL` selects hosted Postgres. Unset, migrate is skipped and the process uses embedded Postgres. Do not commit `.env`.

Set `GENLAYER_CONTRACT_ADDRESS` and `VITE_YIELDTRUTH_CONTRACT_ADDRESS` to the address above. If the source file changes, that address is for the previous source.
