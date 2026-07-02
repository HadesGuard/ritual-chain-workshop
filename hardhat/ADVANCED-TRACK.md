# Advanced Track: Ritual-native hidden submissions

Implementation: [contracts/RitualHiddenBounty.sol](contracts/RitualHiddenBounty.sol),
15 tests in [contracts/RitualHiddenBounty.t.sol](contracts/RitualHiddenBounty.t.sol)
(run with `npx hardhat test solidity`).

The required track (`SealedVerdict.sol`) has one unavoidable limitation:
answers become public during the reveal phase, before AI judging. This track
removes that window. Plaintext never touches the chain at all; the only place
it ever exists is inside the Ritual TEE during the batch LLM call.

## Private submission flow

```
 Participant                     Chain (RitualHiddenBounty)            Ritual TEE
     |                                    |                                |
     |  1. read teePubkeyOf(bountyId)     |                                |
     |<-----------------------------------|                                |
     |  2. encrypt(answer, teePubkey)     |                                |
     |     off-chain, locally             |                                |
     |  3. submitEncrypted(id, ciphertext)|                                |
     |----------------------------------->|  stores keccak256(ciphertext)  |
     |                                    |  emits ciphertext in event     |
     |                                    |  (calldata, not storage)       |
     |                                    |                                |
     |            ... submission deadline passes ...                       |
     |                                    |                                |
     |         owner:  4. requestBatchJudging(bountyId)                    |
     |                                    |  emits BatchJudgingRequested   |
     |                                    |  (submissionCount, batchDigest)|
     |                                    |------------------------------->|
     |                                    |   5. TEE collects ciphertexts  |
     |                                    |      from events, verifies     |
     |                                    |      each hash, decrypts with  |
     |                                    |      enclave private key       |
     |                                    |   6. ONE batch LLM call over   |
     |                                    |      all plaintexts + rubric   |
     |                                    |   7. signs (batchDigest,       |
     |                                    |      winnerIndex) with         |
     |                                    |      attested enclave key      |
     |         owner:  8. submitAttestedWinner(id, winnerIndex, sig)       |
     |                                    |  verifies ECDSA sig against    |
     |                                    |  pinned teeSigner + digest     |
     |                                    |  -> WinnerAttested             |
```

## Design requirements (from the homework)

**Where plaintext answers exist, and who can read them.** On the
participant's machine before encryption, and inside the TEE enclave during
step 5-6. Nobody else, not other participants, not the bounty owner, not
chain observers, can read them at any point. This is strictly stronger than
commit-reveal, where everyone can read answers during the reveal window.

**What is on-chain vs off-chain.** On-chain: the TEE encryption pubkey, per
submission the submitter address and `keccak256(ciphertext)` (32 bytes,
constant gas regardless of answer size), the batch digest, and the attested
winner index. Off-chain: the ciphertext itself travels in calldata and is
emitted in `EncryptedAnswerSubmitted` events, so any Ritual node can
reconstruct the batch from the event log without the contract paying storage
gas for blobs. The plaintext and the enclave private key exist only inside
the TEE.

**How the LLM receives all submissions together.** `requestBatchJudging`
emits one `BatchJudgingRequested(bountyId, submissionCount, batchDigest)`
event. The TEE workflow gathers every ciphertext for that bounty, checks each
against its stored hash, decrypts them all, and makes a single LLM inference
call containing the full set plus the rubric. There is never one LLM call per
answer (homework constraint), and the contract never loops over the LLM.

**How the final reveal happens.** The minimal design reveals only the
verdict: `submitAttestedWinner` publishes the winner index and address. If
the organizer wants public answers after judging, the TEE additionally
publishes a revealed-answers bundle off-chain (IPFS or any storage) and signs
`keccak256(batchDigest, bundleHash)`; the contract stores
`revealedAnswersRef` + `revealedAnswersHash` following the pattern suggested
in the homework. Answers stay hidden through judging either way.

**How the contract verifies the result.** `batchDigest(bountyId)` is a hash
over `(chainid, contract address, bountyId, all ciphertext hashes)`, i.e. it
commits to exactly which submission set was judged. The TEE signs
`keccak256(batchDigest, winnerIndex)` with the enclave key pinned at bounty
creation. `submitAttestedWinner` recomputes the digest, recovers the signer,
and rejects anything not signed by that exact enclave over that exact
submission set: a signature for a different bounty, a different chain, or a
tampered submission list all fail (each of these is a test case).

**Gas justification.** No plaintext or ciphertext blob is ever written to
contract storage; only 32-byte hashes are stored. Large answers cost calldata
gas once, at submission.

## Commit-reveal vs Ritual-native, side by side

| | `SealedVerdict` (required) | `RitualHiddenBounty` (advanced) |
|---|---|---|
| Hidden during submission | yes (hash only) | yes (ciphertext only) |
| Hidden during judging | no, revealed first | yes, decrypted only inside TEE |
| Hidden after judging | no | yes, unless bundle is published |
| Trust assumptions | none beyond the chain | TEE attestation binds enclave key |
| Works on any EVM chain | yes | needs Ritual TEE infrastructure |
| Participant burden | keep salt, come back to reveal | encrypt once, done |
| Non-revealer problem | needs reveal window + exclusion | does not exist |

The required track is the trust-minimal baseline; the advanced track trades a
pinned attestation key for strictly stronger privacy and a simpler
participant experience (no second transaction, no lost-salt failure mode).

## Trust model note

On real Ritual infrastructure the `teeSigner` address is derived from a
remote-attestation quote of the enclave binary, so pinning it at bounty
creation is equivalent to pinning the judging code. This contract verifies
the ECDSA signature on-chain; the attestation-to-address binding happens at
registration time. The tests simulate the enclave with a known keypair
(`vm.sign`) and cover forged signers, replayed signatures across bounties,
and digest mismatches after set tampering.
