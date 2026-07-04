import { keccak256, encodePacked, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hiddenContractAddress } from "@/config/contract";

/**
 * Client-side reproduction of RitualHiddenBounty's attestation math, used by the
 * Advanced-track page to demonstrate the enclave signature end to end without a
 * deployed contract. The hashing here matches the Solidity byte for byte, so a
 * signature this code accepts is one the contract would accept too.
 */

// A well-known test key stands in for the enclave. On real Ritual infra this key
// lives inside the TEE and its address is bound by a remote-attestation quote; it
// is public here on purpose so the demo is fully reproducible.
export const DEMO_ENCLAVE_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
export const demoEnclave = privateKeyToAccount(DEMO_ENCLAVE_PRIVATE_KEY);

// The digest binds to the real deployed contract on Ritual, so the numbers the
// page shows are exactly what this contract would compute for the sample set.
export const DEMO_CHAIN_ID = 1979n;
export const DEMO_CONTRACT: Address = hiddenContractAddress;
export const DEMO_BOUNTY_ID = 0n;

export type DemoSubmission = {
  submitter: Address;
  answer: string; // plaintext, only ever visible inside the enclave
  ciphertext: Hex; // opaque blob the contract only hashes
};

export const DEMO_PROMPT = "Strongest one-line case for account abstraction.";

export const DEMO_SUBMISSIONS: DemoSubmission[] = [
  {
    submitter: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
    answer: "Your wallet becomes a program, so security is a policy you write, not a seed phrase you guard.",
    ciphertext: "0x8f1c4d2a9b7e0356f8a1c2d4e6b90a7c3f5d1e2b4a6c8d0f2e4b6a8c0d2f4e6b",
  },
  {
    submitter: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    answer: "Pay gas in any token, batch actions, and add social recovery, all without changing the chain.",
    ciphertext: "0x3b7a1f9c5d2e806a4c1b3d5f70921ae6c8b4d0f2a6e8c0b2d4f60189a3c5e7d0",
  },
  {
    submitter: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    answer: "It moves the trust boundary from a private key to code you and your guardians can reason about.",
    ciphertext: "0xd41f8a2c6b9e0537a1c3e5d7920b4f6a8c0d2e4b6081a3c5e7092b4d6f8a0c2e",
  },
];

/** keccak256 of the ciphertext, i.e. what the contract stores per submission. */
export function ciphertextHash(ciphertext: Hex): Hex {
  return keccak256(ciphertext);
}

const ZERO_32: Hex = "0x0000000000000000000000000000000000000000000000000000000000000000";

/** Mirrors RitualHiddenBounty.batchDigest: folds the submission set, then binds
 *  it to the chain, contract, and bounty id. */
export function batchDigest(
  chainId: bigint,
  contract: Address,
  bountyId: bigint,
  subs: DemoSubmission[],
): Hex {
  let acc: Hex = ZERO_32;
  for (const s of subs) {
    acc = keccak256(
      encodePacked(
        ["bytes32", "address", "bytes32"],
        [acc, s.submitter, keccak256(s.ciphertext)],
      ),
    );
  }
  return keccak256(
    encodePacked(
      ["uint256", "address", "uint256", "bytes32"],
      [chainId, contract, bountyId, acc],
    ),
  );
}

/** The 32-byte message the enclave signs: mirrors submitAttestedWinner. */
export function winnerMessage(digest: Hex, winnerIndex: bigint): Hex {
  return keccak256(encodePacked(["bytes32", "uint256"], [digest, winnerIndex]));
}
