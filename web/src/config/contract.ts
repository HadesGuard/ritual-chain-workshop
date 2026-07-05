import type { Address } from "viem";
import sealedVerdictAbi from "@/abi/SealedVerdict";

/**
 * Central place for the on-chain config the UI needs.
 * Everything is read from `NEXT_PUBLIC_*` env vars so the same build can be
 * pointed at different Ritual deployments without code changes.
 */

export const sealedVerdictAbiConst = sealedVerdictAbi;

const rawAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim();

/** Deployed SealedVerdict address, or `undefined` if not configured. */
export const contractAddress: Address | undefined =
  rawAddress && /^0x[0-9a-fA-F]{40}$/.test(rawAddress)
    ? (rawAddress as Address)
    : undefined;

/** True when the contract address env var is present and well-formed. */
export const isContractConfigured = Boolean(contractAddress);

const rawHiddenAddress = process.env.NEXT_PUBLIC_HIDDEN_CONTRACT_ADDRESS?.trim();

/**
 * Deployed RitualHiddenBounty (advanced track) address. Falls back to the known
 * Ritual deployment so the /advanced page is self-contained, but an env var
 * overrides it for other networks.
 */
export const hiddenContractAddress: Address =
  rawHiddenAddress && /^0x[0-9a-fA-F]{40}$/.test(rawHiddenAddress)
    ? (rawHiddenAddress as Address)
    : "0x7c7c3305896dBC4920b28a752a591175BdDDE5Bf";

/**
 * Ritual LLM executor address used when encoding `judgeAll` input. This is a
 * registered TEE executor's address (from the network's executor registry),
 * not the LLM precompile's own address -- the previous default pointed at
 * the precompile itself (0x...0802), which two decoded real on-chain calls
 * confirm is wrong: both used a genuine registered executor in this field.
 * Rotate this if the executor goes offline; check the current registry via
 * the explorer's executor list.
 */
export const executorAddress: Address =
  (process.env.NEXT_PUBLIC_RITUAL_EXECUTOR_ADDRESS?.trim() as Address | undefined) ??
  "0xb42e435c4252a5a2e7440e37b609f00c61a0c91b";

export const ritualChainId = Number(
  process.env.NEXT_PUBLIC_RITUAL_CHAIN_ID ?? "1979",
);

export const ritualRpcUrl =
  process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";
