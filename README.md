# Funding arb

## [Funding](./apps/funding/src/index.ts)

- Saves 1 and 5 min averages of funding rate of SOL-PERP market on Drift and Mango

```env
DB_URL=database URL
RPC_URL=Solana RPC URL
PRIVATE_KEY=Solana wallet private key, f.e.: 25,48,200,...
```

```sh
# DEV with ts-node
pnpm dev

# START with pm2
pnpm start
```

## [DB](./packages/db/src/index.ts)

- database schema and helpers

```env
DB_URL=ADMIN database URL
```

```sh
# push schema
pnpm db:push

# BUILD
pnpm build
```

## [Mango](./packages/mango-utils/src/index.ts)

- Mango utils

```sh
# BUILD
pnpm build
```
