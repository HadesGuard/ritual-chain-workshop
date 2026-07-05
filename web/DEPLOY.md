# Deploying the web app to Vercel

The frontend lives in `web/` and is a standard Next.js 16 app. Vercel builds it
with no extra config beyond the Root Directory and a couple of env vars.

## Import

1. In Vercel, "Add New Project" and import `HadesGuard/ritual-chain-workshop`.
2. Set **Root Directory** to `web`. This is the one setting that matters: the
   Next app is not at the repo root.
3. The framework auto-detects as **Next.js** and the package manager as **pnpm**
   (from `web/pnpm-lock.yaml`). Leave the build and output settings at default.

## Environment variables

Set these under Project Settings, Environment Variables. Only the first is
required; everything else has a working default baked into the app.

| Variable | Value | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0xa209d966d235e4e7130c5af1a7b08f665abfe170` | yes (SealedVerdict) |
| `NEXT_PUBLIC_HIDDEN_CONTRACT_ADDRESS` | `0x7c7c3305896dBC4920b28a752a591175BdDDE5Bf` | no (RitualHiddenBounty, falls back to this) |

Other optional overrides (RPC URL, chain id, LLM executor address, WalletConnect
project id) all have sensible defaults for the standard Ritual deployment. See
`web/.env.example` for the full list and suggested values. Injected wallets
(MetaMask, etc.) work without a WalletConnect id.

Every var is `NEXT_PUBLIC_*` and read at build time, so redeploy after changing
one for it to take effect.

## Notes

- The production build is verified locally: `pnpm build` compiles all routes.
- A local "inferred workspace root" warning can show up during `next build`
  because of an unrelated lockfile elsewhere on the machine. It does not happen
  on Vercel, which builds from `web/` in a clean checkout.
