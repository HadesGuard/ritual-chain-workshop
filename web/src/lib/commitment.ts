import { encodePacked, keccak256, type Address, type Hex } from "viem";

/**
 * Client side of the commit-reveal flow.
 *
 * The commitment must match what SealedVerdict.revealAnswer recomputes:
 *   keccak256(abi.encodePacked(answer, salt, msg.sender, bountyId))
 * The salt never leaves this browser until reveal time, so we stash it (plus
 * the answer, for convenience) in localStorage keyed by contract + bounty +
 * wallet. Losing the salt means the commitment can never be revealed.
 */

export function randomSalt(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;
}

export function computeCommitment(
  answer: string,
  salt: Hex,
  sender: Address,
  bountyId: bigint,
): Hex {
  return keccak256(
    encodePacked(
      ["string", "bytes32", "address", "uint256"],
      [answer, salt, sender, bountyId],
    ),
  );
}

export type StoredCommitment = { answer: string; salt: Hex };

function storageKey(contract: Address, bountyId: bigint, account: Address): string {
  return `sealed-verdict:${contract.toLowerCase()}:${bountyId.toString()}:${account.toLowerCase()}`;
}

export function saveCommitment(
  contract: Address,
  bountyId: bigint,
  account: Address,
  value: StoredCommitment,
): void {
  try {
    localStorage.setItem(storageKey(contract, bountyId, account), JSON.stringify(value));
  } catch {
    /* storage full or blocked — reveal will need manual salt entry */
  }
}

export function loadCommitment(
  contract: Address,
  bountyId: bigint,
  account: Address,
): StoredCommitment | null {
  try {
    const raw = localStorage.getItem(storageKey(contract, bountyId, account));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCommitment>;
    if (typeof parsed.answer !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(parsed.salt ?? "")) {
      return null;
    }
    return { answer: parsed.answer, salt: parsed.salt as Hex };
  } catch {
    return null;
  }
}

export function clearCommitment(
  contract: Address,
  bountyId: bigint,
  account: Address,
): void {
  try {
    localStorage.removeItem(storageKey(contract, bountyId, account));
  } catch {
    /* ignore */
  }
}
