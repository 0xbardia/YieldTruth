# Frontend

RainbowKit connects the wallet. Writes go through `submitGenlayerWrite` in `src/lib/yieldtruth/chain-write.ts`:

1. `eth_requestAccounts`
2. Switch or add Studionet (chain id from config, default 61999)
3. `genlayer-js` `writeContract` with the injected provider and `value: 0n`
4. Wait until `TransactionStatus.FINALIZED`
5. Surface the hash and a contract error if the receipt finished with an execution error

The button stays disabled when no contract address is set, or when the row is a fixture. There is no private-key field.

Copy for components and decisions lives in `src/lib/yieldtruth/copy.ts`. Status is not color alone: the stamp text says approved, rejected, or review.

The visual system is one liquid-glass language: a vivid emerald, gold, and aqua field, frosted panels (`.slip`, `.sheet`, `.glass-bar`), and the mark in [public/logo.svg](/workspace/public/logo.svg). Buttons are `.btn-solid`, `.btn-glass`, or `.btn-ink`. Headlines are Newsreader, body is Source Sans 3, hashes are IBM Plex Mono. It is not a purple gradient.

Motion is a slow field drift, a one-shot entrance, a single sheen on the sample slip, and a 160ms press. It stops when the user asks for reduced motion.
