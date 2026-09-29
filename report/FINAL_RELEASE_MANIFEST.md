# YieldTruth V1 — Final Release Manifest

Generated 2026-09-29T23:46:28.713Z by `scripts/release-manifest.mjs`.
Canonical root: `/root/YieldTruth`

There is **no Git history in this workspace** (`git_history_present: true`). This manifest
therefore makes **no claim about past commits**. It is a forward-looking baseline: a verified
fingerprint of the exact source tree that produced the certification evidence below, so any later
divergence is detectable.

## Identity

| Item | Value |
|---|---|
| Application source tree SHA-256 | `8a36b1e3d6103564a32551130f876b65e028aa66ded5667371dee84045114b2d` |
| Application source archive SHA-256 | `e7886bfb6e2fc902ff20c4251dc34ffb3f343a0b9a1689ce1642980f2ff1e29a` |
| Certification evidence set SHA-256 (`report/`) | `57ba02977d46ff07b7e5996ff7af15e1319085a6770cadbb980970d08e4bb68d` |
| Archive file count | 180 |
| Tracked-inventory file count | 180 |
| Tracked-inventory total bytes | 1605069 |
| `package-lock.json` SHA-256 | `e5481f9032139e506df6e90d46665a1c9a1c5324181e7a0892d3948b628e7f9e` |
| `contracts/yield_truth.py` SHA-256 | `eef7fa511d79141f8da4786db777c86fba4c26082a71599833b8bdfb238c22f1` |

The tree hash is computed over sorted `(path, file-sha256)` pairs, so it is independent of
timestamps, inode order, and filesystem layout. The archive is a `tar.gz` of exactly that file list.

## Secret exclusions

| Check | Result |
|---|---|
| `.env` present | true |
| `.env` file mode | `600` (600 = owner only) |
| `.env` listed in `.gitignore` | true |
| `.env` inside the distributable archive | false |
| Secret-scan findings across the inventory | 0 |

Excluded from the inventory and the archive by construction: `node_modules/`, `.vercel/`,
`.grok/`, `.nitro/`, `screenshots/`, `attachments/`, `__pycache__/`, `test-results/`,
`playwright-report/`, `report/`, `.env`, `*.pyc`.

### Secret-scan patterns

- `-----BEGIN [A-Z ]*PRIVATE KEY-----`
- `\bPRIVATE_KEY\s*=\s*\S`
- `\bMNEMONIC\s*=\s*\S`
- `\bSEED_PHRASE\s*=\s*\S`
- `\bDATABASE_PASSWORD\s*=\s*\S`
- `\bWALLETCONNECT[A-Z_]*\s*=\s*[0-9a-f]{16,}`
- `\bGATEWAY[A-Z_]*SECRET\s*=\s*\S`
- `\bAPI_KEY\s*=\s*\S`

Matches found: none

## Inventory by area

| Area | Files | Bytes |
|---|---|---|
| `(root)` | 20 | 621857 |
| `contracts` | 1 | 38396 |
| `docs` | 10 | 16572 |
| `migrations` | 2 | 4763 |
| `public` | 11 | 295832 |
| `scripts` | 39 | 238001 |
| `server` | 2 | 3868 |
| `specs` | 4 | 9128 |
| `src` | 87 | 335968 |
| `tests` | 4 | 40684 |

## Certification evidence set (`report/`)

Hashed separately and **excluded from the source baseline**: writing a finding must not change the
fingerprint of the source it describes.

| File | SHA-256 |
|---|---|
| `FINAL_RELEASE_MANIFEST.md` | `8b56de42daaff51f34c035e846325686a5c3c721750b0e32cf36c5470bf1f46a` |
| `FINAL_USER_QA.md` | `fe5e3933fd13dd6c56a21806f0c2325fb091796c3b8a39c6e27260553b3ffb1c` |
| `FINAL_V1_REPORT.md` | `9cd00565d978484efd085ff6c18efc01914edb3cf4934af82f06f5fe954489e1` |
| `PRODUCTION_DEPLOYMENT.md` | `ebae0cdd517066e4f158514b6709c08ac27fa3f1a080d0c4b076b45a94b14d15` |
| `SECURITY_FINDINGS.md` | `39542602e0c79e2250732b975a5faefa708bf56c7c02216e93d248616e9d2417` |
| `chain-verify.json` | `03c8fd1b3c21fdb50f22c1ef35f754f0598e7cc8333dfcea8179cf6a0cc24677` |
| `release-manifest.json` | `fd31c0a236368404227783336e45c4f2eb9e743172896962a1b5792fba484acb` |

## Full file inventory

```
18b99ca50e595fe0ba1e098e60d9580a4a3d1e72b5c80a4b9572538aab953653  .env.example
8b3c3f560e1fe2486f903f66ba1900e20739aaac62a92569dec10ccf6f6d8488  .gitignore
d5f90f76c5b68ce7be5ba077813f97e1983511b8c314764537345a538c1261f4  .prettierrc
e3ab56ff0854fd16b87f55ce7f3d9eaf55005a542d52e5d8237a519288e5762b  AGENTS.md
d655a9d839e0ac6eed6a37d28e3cb750427a9d06207bca03fdcb99715f821436  CONTRIBUTING.md
959f5c0dfd4e5cce3dc33fe70c1232f70c232c3aecbea542a4591bf0b14e844a  LICENSE
9d8a0f9489fc6f60ebbc7f05a59af30d076ff018cd8fe6f74a36e01be222f15e  README.md
c68448e79db5f307509db085354b6d1459ecdfbd4cddacc972bd2532edfe0a1b  SECURITY.md
ab0e87b2c800f326b91f469ffba01b9cfce9628904b25a59725fab27e3e48394  STATUS.md
eef7fa511d79141f8da4786db777c86fba4c26082a71599833b8bdfb238c22f1  contracts/yield_truth.py
0f71fd3a11ffe7bc0182e2b0d3a47c6e67bd39c5084e0b86612655b339085005  docs/api.md
3027ed5e4dcaa5afd92a5ac65d9597675a751dfe7ebd9c59431439e26cd06bc8  docs/architecture.md
6036a2484b1ad1e9a3e9ddaf59c1d42bbb406e11ddd6def845b1fa580d290250  docs/contract.md
61a9af7067b4a18000f464d256b131042448ddecc4f17efd04e397a20e2db216  docs/deployment.md
6d930147fb6cd60883b97cc1792f64cdeb72d4b1fa4faa759d34335b7d8ca01a  docs/frontend.md
43b72c671e9bd0481340a005837dff09498bc1e424bb4676c499d4e58ef31437  docs/methodology.md
d270fc0b3246d390b1b374d29fb98d2497c15c0f8924b5e813fec7ff30ab214a  docs/overview.md
5e6c58d8012011751d8c654e38d655193256e144070bb92333c325be8df8dfd1  docs/roadmap.md
74d9fecf45baa4260e6f6acd715759999f62baf03ee90044fa9fe6ffe5d3088f  docs/security.md
435d94d12f1c1f4130b4837580bd2e800c89d7ec6d0d30f7496d65b35fa4ab6d  docs/testing.md
eae1372df115308472c67324f7592f2fa8fa05285bc64e77f690a14e69764262  ecosystem.config.cjs
9c79df07c33ff6aa13876bdd1e7e6652aa1ecb377c7b7f029f7915d215ee4488  eslint.config.mjs
e281187bfb146e00c2c2e4ac3f57800aa01cd031bed8893fbbfa8c80b222f3c2  gltest.config.yaml
e853eb6833c4963c8723639d92bd6359e0c95159ba2d7730eb91e46f14f07690  migrations/0002_yieldtruth.sql
f953cacc448c0c81ae4fe63e66b0e59569e840782ad279fdee201dff529363e9  migrations/auth/0001_auth.sql
e5481f9032139e506df6e90d46665a1c9a1c5324181e7a0892d3948b628e7f9e  package-lock.json
88819ba7ebf75dad1539cd962876e54aad3c7dd55fa6640ca21b1e81ffcbc8eb  package.json
efd6f87d8205a2f14427c01498623b4ee14152c85ad5cbcb49de6e9df7ecdf71  playwright.config.ts
3274f0c414f3afa79cf6bf6dd9e95390b19b49aa1a74dd21bab31f924274f178  playwright.prod.config.ts
3cf5d17d294b51c6cca6c86070309b88554b7ad702b0412e8e2709a01990bc8a  public/__grok/icon-180.png
a677c9356c23d1e699559ddbffac97cd135c2782cd893fb34f3738f6d11bee17  public/__grok/install/assets/homescreen/glass-puzzle.svg
efad1b4b507a68c1f1af4aad2c93e8c24076224aa593da86677697f543d026d6  public/__grok/install/assets/homescreen/glass-share.svg
0654e3e59cce69856f38525cbfe4ab3a9ef52d4b64c8532dd0bc1a3f34fcb5b1  public/__grok/install/assets/homescreen/logo-grok.svg
4c9b09a4660c662b394597d551a04124293b0e37a7a7c72271dd2948c4499a14  public/__grok/install/assets/homescreen/ob-ipad.png
80e0a5ede614d9b920c67d7cb79c80a79134687b1fc9f560384e896a88e302db  public/__grok/install/assets/homescreen/ob-phone.png
c2c94be46aa2c3c2fda95d7c6f2fc6d0b656d1f5847828d5d95b5a81a6f4f20d  public/__grok/install/assets/homescreen/plus.svg
7e8e881302f58e54a9c07e7be395692d3de20fdaa27ce358531cc8dcca472cb6  public/__grok/install/styles.css
fd21ce4f473b0dfcec7dd5a26960b9ed0725cccd3a0739fa5472fddf1113a85a  public/favicon.svg
5db744abbe0e33e826767298188ff7d071dd7f477edc3460687a22bcafbb8691  public/logo.svg
1a88b56d009d2969d7980c712b3f00ac1494622598c6c5a601b77fcc152b1643  public/og.jpg
92962d2361a98413c0cef80b31266d49b063cf4ecf6421bb99f57f6eef4ed7b6  scripts/app-env-plugin.mjs
318f33ce7b29b55c386cc8847084068777880f795a5082043229bb06686be035  scripts/brand-check.mjs
9453aa9a31d6c4aa8015c6a80b02948fd989586ccb32bf139d0a93643576fc42  scripts/brand-check.test.mjs
c6fb865defe5a37bd94e3805b00311d4e8267daf92812e39f62b1213d947265e  scripts/browser-guard.mjs
5699614f7fa62515e25ba9cca6397db2770cf6feb9b973f3c19f2915874c53de  scripts/browser-smoke-verdict.mjs
48b3924b41d606f94a9b8faae47ff350b84978fdd5ab3f6ca01640ed4c7087d7  scripts/browser-smoke-verdict.test.mjs
2e1cc3136f33bd74b73b4b3dba812e74ac299c24893b9a7c406e9bbeaf46571f  scripts/browser-smoke.mjs
de21fbcaa013d304f24fa1213f9d537b6178ae534ec3da7a67b5cd9ebd5e9ab7  scripts/chain-verify.mjs
d712203c4bc92c197c342e5c91660fc5a141a31171f22f35c505a0bff45f98ee  scripts/check-auth-invariant.mjs
75a58f44dffb2fc77eb47473638646f607dba26a68a6900156031c7b6227cf3c  scripts/check-auth-invariant.test.mjs
36331d0bc0664debb5068bd6869d3089dc41555b7770c9ccb577d8845958835c  scripts/grok-pwa-plugin.mjs
fb89f480ee565c24db42eb46d3d582f1fc6b9d6259a484aaf2f94a19d0799fa1  scripts/grok-pwa-plugin.test.mjs
99c8342319978d71ef3dea4989c05ecbf096946c39a255fa08f48b081a3e506b  scripts/grok-pwa-shared.d.mts
860da7df5e0e5698ccc0ed9def2eb981c2f396831c5523368d031ec740b88b9c  scripts/grok-pwa-shared.mjs
5f8fe91f837db8d74d68db5e057948918bd9299e097700e0bd18f1cf5f94e586  scripts/install-page.html
e1a31c8046a099df37b4bcbcafa4f4f7d7d18b1f1f0dc6d79676d41c4be976be  scripts/migrate.mjs
9305d8cfe8cdad73671065d675c89d0f20075d18c756f9aba5043b72e7c19a0d  scripts/migration-plan.mjs
aaffe3f8a25f3f04b0946a18afa89c6c7278ba009db360bff4f5afa904f30b92  scripts/migration-plan.test.mjs
fd7263a1dd76f788c2b51e9381e1f1de1a58993fd94e01040285556cd38c0c40  scripts/preview-thumbnail.mjs
b366b1c28844cda81d21e36a88af5f548bdec6a5a4b3000aac12be3ec99cf605  scripts/preview.mjs
0105fe41d056ecc22c586a191a9cbd7d0e838b7c878d6993c8c9573c7ea708b1  scripts/preview.test.mjs
e6f5a971ebc096f87c652848714052ed0727f8c459e1b6efe481ad25dc429ef7  scripts/prod-browser-check.mjs
e67a3ad6dc80598081fb8374bf956e4e9e8bff4f93bd3727c35f20e22083aab3  scripts/qa-a11y.mjs
b733d51d1bce7e7bd537edfc08fab691f249977bd8188ba2c32783448f8d1377  scripts/qa-failures.mjs
9e903e980d140183f12b194ae2ea364a36db90b05488ba525b027123ab700539  scripts/qa-journey.mjs
562ed1448fabc1d8377d326c31d544586aadbfdc8e119ff5b8197471a11b3eae  scripts/qa-mobile.mjs
9ae7a47cbb224166f7792f3a2142a60e400528d2a4af6ac82b68a4ffb4f92b7f  scripts/qa-probe-policy.mjs
dccb3c2c1c05c025b783e50acbf1b888784704d78ce21601227b9f72edcc05d6  scripts/qa-probe-wallet.mjs
2e317494d65e10fccb319512d68fada707d170e2ae7fab8766c45a457b5641c0  scripts/qa-retest.mjs
fcf0f1a04d4e85202af3977ab1c32b5a7acf30ad6c8188810185053b535e6836  scripts/qa-txlifecycle.mjs
b1445ba795babd59927c3adfba4e1d9f7d3e88fa84cd5517e673430b280025a6  scripts/release-manifest.mjs
2e35825c94427880f2ba4b5554c91d707a045f1cdc40798d190ccdcf3b92dc47  scripts/serve-prod.sh
32ae072de23b5138bf849c344caf72ab2dab6cb4617ab9915db4e4f5b9c7e2f0  scripts/sign-out-plan.mjs
1942e32f4b6a9d8b62733338b0f0e1a7d84ed278b4e6c4f24fa7616a3abc694e  scripts/sign-out-plan.test.mjs
a846b68bd3645299c23eef965d9ef226df3a500d345d7576c23f7a2b2ff643c7  scripts/with-app-env.mjs
384ea7d0d20f980f733ee38d8f48b0bedd8a4ad39c80ca4792b9aeebcb275851  scripts/with-app-env.test.mjs
650b62e8aa38697e1b931049025afe3aac829e6761a8aadf428712faef8b1544  scripts/write-atomic.mjs
e266ac99149651c368715317820934f0e8942db0fc763725ca4a096bf169ad3b  scripts/write-atomic.test.mjs
c6b70061026e4d83589f968e017f333d7e08c1609514299c1ecda735fa4fe5f3  scripts/write-path-check.mjs
340f1fed44355a61fefdaf29a752c524ac029afb00bea3f40cc996cdb289d2f8  server/middleware/grok-pwa.ts
74847f2b2bade154ac07dabb239c4718a745c095df530e78b8f1ef9f053edfa2  server/virtual-grok-og-identity.d.ts
ddf73b56280bd1ad9df4d0c8ea670223520b6e3839a209b6c636a94770dbfa2b  specs/V1-BUILD-SPEC.md
1c04960f5d33190d1bc55d37cf274059018840751805c7a500eed30643754367  specs/constitution.md
8f7cca97d22f23bd330d75fc7b8bd9258a398bdfa2514b515cf25ea065fc820d  specs/plan.md
2bb249c23124f3e0431fe58f67522346550ef1d01183159c229c35bdd5e5dd7e  specs/spec.md
e4277e80ce127e7305057fb280d03d0703c5c7115b17d2e2aecf000e4867555e  src/components/preview-host-bridge.tsx
80ab9849cb8ac6f36de976b474ba4ee4f817c93b84df4e81fb3aa0f125197201  src/components/yield/shell.tsx
f6d14c7c29716a21a264c8c67b473e1ebb101d6dd720813647b376f99e62993e  src/components/yield/wallet-slot.tsx
2e9f3c1bd62e538f7380f33c36407fd8baeec44abe6b789e6daf0b1d66b2a583  src/components/yield/wallet.tsx
0fc997204c50ece97925d4f783a8346f02c9bd7d6b9517232c47a2f30e95ead2  src/components/yield/write-box.tsx
ec0c40fdaafb4e3d551086de9f9b4a745da7c252f7fbbc5c51a8b1b0a541391e  src/lib/app-data/app-data.test.ts
c8efbcbf4f7db3189225490f4958ed009969e752954a2258038e5fcf7d5b4e3e  src/lib/app-data/client.server.ts
8e0dd8d761b2a5a1cafcb7523e2063151f0b6677837b19c3f6d494af148f3889  src/lib/app-data/errors.ts
72cf57dc1a863f9693d34c11772ba4bae790cc17d9efb1e8619b8a2e6247a7fa  src/lib/app-data/index.ts
fbc723841bb67148dd9de12ed614ba6c095d799a533309857cc4d202d6be5ad9  src/lib/app-data/login.ts
97c87401c474b9f87f2e21152fb377744f353736848f0044466ba2e260b06745  src/lib/app-data/readiness-schedule.test.ts
3ea7f192220446b08747f3ef76c7d2fe150356470621f2220738b23e7976f683  src/lib/app-data/readiness-schedule.ts
377786c1cf739eb9dc7c8b2bdcd09991686a700375a67a0c6e73b4334d394da1  src/lib/app-data/readiness.ts
82821474088face6b9fcadad49793629e5f07a16386402b816262a1c070a3210  src/lib/app-data/server-only.ts
65f3c7566db12661ee9d3633eaae66a85505e00f57a61c258fa72bd22881489f  src/lib/app-data/types.ts
57e6d2b3709be83ac2eed9c42eaa822a067fb5aa44a6098c982892c43f3a4f2f  src/lib/app-data/use-connector-readiness.ts
4bca649afb627b11231a7b31acfcffe9323efddebc05944b2d769d2b8589294f  src/lib/auth/client.ts
9b1da7c786e48adfa9a6f7c485bcf5817cf2075a601d8726a965f11171910354  src/lib/auth/email-password.ts
96546b8b6910a01163c36c34a0d417d803bec222b93304be764d810838764159  src/lib/auth/gate-identity.server.ts
21202fb2b56ffd10cb9b5bb7d9f305be88cce3902b858f73cea914df05ce2652  src/lib/auth/gate-identity.test.ts
3dbf8cb789b0288f9d5c53b1515a3e87d265fcb22e11fe28dc3289c4bd7c06eb  src/lib/auth/gate-session-marker.ts
68aa500523ca2f0ad5c7ba34372c10aa1851a9774f8567c6b7781af5dd6cf204  src/lib/auth/gate-session.server.ts
39950c211bd4ad4f7129082bf5a43a42ff23975e681b99fd7cfbce372f83a5be  src/lib/auth/gates.tsx
a4adf6a5d548e70a0be52d7efdc7433126028908072b47bf9f92135d9ee558a0  src/lib/auth/isolation.server.ts
8dc37c4e9bd583f175402330d0952ef4d584c7410723cc2649c4046d5084bd80  src/lib/auth/middleware.ts
bd66925574245cd47cdd98b5c068dd7b4ee4a51c9439e8421dc54c62fe7c4f50  src/lib/auth/pglite-dialect.ts
81f8833d9ab639f76b86f4bb23fed42a04cec4b0c6d90b7a67425a9232c9bb4a  src/lib/auth/popup.server.ts
d52a3654a5cef7e841cbca789fd106dc464ea55db574f02aa5d295b7350f8664  src/lib/auth/preview.ts
4cbbc7f8cc1765788ad65455a33f64dcdafc6fe4ed1d13f90ccfa0ba4c13d1f3  src/lib/auth/provider.tsx
4acefac17931529bdeab053588a917b06e44abdb67a275a2ca1c7841080c6a78  src/lib/auth/providers.ts
e0544cadbfa1a09c3cb4cf2a0ec187dbbb2831aebf7de887a3c858abdd72ca43  src/lib/auth/server.ts
2c352588cb6a8f58faf3aecc1d1f418ae827ddbb6a5eca8e56668ec72cd328d2  src/lib/auth/sign-in-gate.test.ts
d2c65c20ab50ae41657ceecd61ded005fac29315deace9fc4d966cf56300754c  src/lib/auth/sign-in-gate.ts
a0cc4bd74b6da5b346b6bafc1aec58b9bf5cc0278264379b737b79a5cff1e482  src/lib/auth/use-current-user.ts
42a7d5c1b17027ba004d6524a7f7bb4827b908d75ee3c3aefc940fa9c891c2ee  src/lib/auth/verify.server.ts
8decf7689ff4833ad2f6f263eff9041dd2a68ce923824fa1d55ad620dea72e49  src/lib/db.ts
9b834e0978ae76332a65a05f5bc75f80684db8c6aa638916869385c12e3343d5  src/lib/env.server.ts
2677698fa3384da066d88c111402c1c113971eb5a0373f424489fd4bc5b9be93  src/lib/error-component.tsx
c1758cd57fcb44dbc7d6b1e0e57dd2b30330180906702720e58551a5c6e547b1  src/lib/og/site.json
c2d5e1acc5653ff2abc08a5eeb5feb3331f4e3d7c751ec83d60dee83cf33a6ee  src/lib/preview-embedder-origin.ts
96b9830f5e17b165f4ae3c90b52e73c24cc6f03b6583f65e568e479dd95c8ba7  src/lib/preview-host-bridge.ts
fb14b21151a12254cb7043bd57846cf38e2e584acc822c2f503a56de7baef130  src/lib/yieldtruth/chain-sync.server.ts
f557353400a778e6590635b43944927d940c0e7a1603e93bde720df6b90573f0  src/lib/yieldtruth/chain-sync.test.ts
bcf3176b79fad514dc48c761e4d289b898a194dbd1ceb7713dea5d6e2b356cf8  src/lib/yieldtruth/chain-write.ts
77a2c29e0d3c00f3f902eb0c014227f1d2acfa26f754c7c3295f632db1bfed51  src/lib/yieldtruth/config.ts
9badbe3f32d80b381128bbbbbd3c29d606bc479a2284a1eff2eb95eeed44e37f  src/lib/yieldtruth/copy.test.ts
84c32a0a8cc42bd82346f0fe1b00c33c309867da1dabf0e9aca11c1164322950  src/lib/yieldtruth/copy.ts
a27fdc681d544be50eb06b1c0c53bfdd6216e406071568da21430e3f09deae6c  src/lib/yieldtruth/fns.ts
36dfb01ea49a52de6630833da3d55460fdc7f55c86869cf7b639d1e4987dabe6  src/lib/yieldtruth/http.test.ts
3a6eb3d1f4abcf388087642533b12e6ab8fe7f630343b50f60a26865e777fe85  src/lib/yieldtruth/http.ts
8dee3214853c468c14b11cf30a7e54c965ef57203e2f2ce8161d9625d5b29ab7  src/lib/yieldtruth/indexer.test.ts
d6b713792fa94147c9759a9ada6358a8dd2be27e7f593303e64c9c1ec74274a0  src/lib/yieldtruth/indexer.ts
27b37e8cc7d7ad48ce4f6ace2e368853ced3afef9b9dc6d41276bf020ab0c276  src/lib/yieldtruth/policy.test.ts
0faef209f2a2802a4ee78f4cf4a5473438fdfe9eb79f5ab490c0ace22fd1b335  src/lib/yieldtruth/policy.ts
fe32d09aa1c759a2bab2eee93fd61e9248e71502fd6f197dfa2a80ad7af13e95  src/lib/yieldtruth/public-config.ts
bd49d1e652bfbb3aa82a37ddf75aeb76ee9646ee5eedd84d924401ebe6b22560  src/lib/yieldtruth/repo.server.ts
9b2129669823d574e3c78089b2dc57d098ae45f9acfcf0a1c13f2514fcec7761  src/lib/yieldtruth/types.ts
6972d5c21bb3595505c801780d28c763a7acf817cb3c7aa8542dbdfb5ab19b43  src/lib/yieldtruth/write-errors.test.ts
a9640bf543303c41e4b153c65461fd46bc7c08cdc3834c778fc96223741f86f8  src/lib/yieldtruth/write-errors.ts
5cf63f62d1c1af000d9f02c2cb491b93025ad14aa39bcd9ac4eaa3abc96d3064  src/routeTree.gen.ts
4e6fdca905c62ee1e8d1b5a9b181f995c0491de2ef751409a31d7c28934799e1  src/router.tsx
7e0cbc67cfaed430f45547713880ac12fb9423ce175411e6369ae8aa6518b731  src/routes/__root.tsx
4608889e9d27b4e48f8c95fc62945c0af9352864a27ab622658725456a0b027e  src/routes/activity.tsx
6d1dd523160a82ce8284d03daff8c3f04a571a568172565880bf33331414b4f5  src/routes/api/v1/activity.ts
531da053e2da37759d25fb4ccc82264960844ebe8a048af9318dd22ecda3c174  src/routes/api/v1/assessments/$id.ts
c2c9fa7dc4f6d4dc3eba289fea2720a4480809bb22b894da9f0944cb97959cb7  src/routes/api/v1/config.ts
8fb8627ead8c9bddee61cbd40fffed53f8a4d99c164c5d5ea2bd3501330eaa79  src/routes/api/v1/health/live.ts
4d2d86206e3976ec3e4c5a73ea2cfa313f28446d7f1f558432ae9f11996da9a1  src/routes/api/v1/health/ready.ts
b1fd55b0aa16cb68b38a09dec9429ed86c0408d652fc0ec6349623c821e1e297  src/routes/api/v1/opportunities/$id/assessments.ts
b83a702a7947501261e29aab64536bf0df127f91bcedc9668d332c16b25df19c  src/routes/api/v1/opportunities/$id/index.ts
26e0a8daa8d24638f4800e9beb492c657085a9ed4586c5f81cee2ddf4953c7ce  src/routes/api/v1/opportunities/index.ts
fab0b675ccd098a8ffd01c5b18edd9d2b85e52c13ece90ff0f7ec64e76c866bf  src/routes/api/v1/policies/$id.ts
04296913f94aebab76cd262dad752e85c9c46a6e64aabfc3cb636fe054a31b2c  src/routes/api/v1/policies/index.ts
90398f3d0a957b33c1eec34e86cbf4594a119b093ac98913356c8eb4e75abd44  src/routes/api/v1/sources.ts
536ca9fde3a963b1ad42bcc002e6065b7051e27d16f777c1c0159f24d9531c9b  src/routes/assessments/$id.tsx
bfaa520e2437ae4d6177b242349caa32d9b7fc6523845251605cc3b99e593a8b  src/routes/docs.tsx
8ef54b08bab32c7a399277b931ed0c7f54f215bb2fb53771d71b3a132b42f4dc  src/routes/explore.tsx
cdfd7227b8a088d9e2fba441d8faf1c5967e88b271cc77d1106809e4e67ba038  src/routes/index.tsx
291a2bc504a5dc432c26497625152a401e8d56e85664a5a32c2c74d6bfedbc03  src/routes/methodology.tsx
5fcca9ed9a676beb3ebee38e8a0b64600dbdf740eea9b782877ff55594cfefc3  src/routes/opportunities/$id/drift.tsx
8ac2cfe06a244c2f856390b7856753c4b986f6113decec31963e69139adb7143  src/routes/opportunities/$id/index.tsx
6997b22ce8d012d7511f9b01f768a5ae34d86e1a63f9bc8922cc82091ce675fa  src/routes/opportunities/new.tsx
45db89e7b745aefa858bfd1a262ad8243a7816c5478093bfd4c06944a9f8c2d7  src/routes/policies/$id.tsx
c8ca4db2d4ccd367f97473e559c377858ee59b68fbc1c7d532aeabbf300d838b  src/routes/policies/index.tsx
7047c07914de443e607c926d6c2e94734fc393c7d40e1e3c99a20ce7316c9438  src/routes/policies/new.tsx
e2c00e3efbc36aff99f6bd3b45cc031e1dbe311d6f00d1c977f634829fb82c7d  src/routes/roadmap.tsx
1e01666fbc733327f9738dcd32983f96573b95a2229b7a01ba4907d9c6b98414  src/styles.css
5c3ebf1fe5bf27ac7b9e5b49b43237118479a953dd3f417833aab7a9f9bba2e9  startup.sh
301637c152d12f4c4f9a820bd2630f9108d6132d8e1a213fbbddc4bc92e54857  tests/direct/test_yield_truth.py
aee65977e1d4fbc7624ea38bdd59397bb720133d966001dc9cbc8096d9a2df6e  tests/e2e/desk.spec.ts
f2b531285f9448d8ba94a8c0ca4a204b4770f1ff2fe57c686157c262e8480d61  tests/e2e/user-qa.spec.ts
b284d458612c53f02428b6f3791685de64a8fed12b46563dcffccb9502802bc1  tests/e2e/walk.spec.ts
8abad87a6c62322f1f4fdff02d5f3f764ea10a98c49cfafccdc288a0dced492f  tsconfig.json
b621d84931055b57a73e6d4547ab4b161b6bfbf091806354d3f6f67d0f57700f  vercel.json
6fb5b5fe5b0a83b015e02100dc70f26224833a68a94758ad7fcc8a3980ca3b4e  vite.config.ts
```

Machine-readable copy: `report/release-manifest.json`
