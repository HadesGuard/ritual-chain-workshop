# Privacy-Preserving AI Bounty Judge - submission

Commit-reveal upgrade of `SealedVerdict.sol`. Answers stay hidden until the submission
deadline passes; only verified reveals are eligible for Ritual LLM batch judging.

## Deployment (Ritual chain, chainId 1979)

- Contract: `0x712A26E121c12F2e6D576a7CE5A2be21Be939652` (`SealedVerdict`)
- Deploy tx: `0xb6749b72e181d5f258c7ad2058310ba14faefd6d838187bcf8fd7b2510cf1a30`
- Deployer: `0xB6F30F2577FC57ec3c46d79438f10EFC85a504a1`
- Deployed via Hardhat Ignition (`ignition/modules/SealedVerdict.ts`)
- Earlier deployment (same code, old `AIJudge` name): `0x9eA7235d9D9870c53EA41868C84EAD757ee86e3c`

## Lifecycle

```
createBounty(title, rubric, deadline)   owner funds reward (msg.value)
        |
[Commit phase]  now < deadline
        |   submitCommitment(bountyId, commitment)
        |   commitment = keccak256(abi.encodePacked(answer, salt, msg.sender, bountyId))
        |   Nothing about the answer is on-chain. One commitment per address.
        v
[Reveal phase]  deadline <= now < deadline + REVEAL_WINDOW (1 day)
        |   revealAnswer(bountyId, answer, salt)
        |   Contract recomputes the hash and verifies it. Valid reveals are
        |   marked revealed and become eligible. Non-revealers are excluded.
        v
[Judging]  now >= revealDeadline
        |   Owner builds llmInput from getRevealedAnswers(bountyId) and calls
        |   judgeAll(bountyId, llmInput). One call to the Ritual LLM inference
        |   precompile (0x0802) judges the whole batch; the review is stored
        |   on-chain in bounty.aiReview.
        v
[Finalize]
            finalizeWinner(bountyId, winnerIndex)  -> pays reward to winner
            (reverts if winnerIndex was never revealed)
            reclaimReward(bountyId)                -> refunds owner if nobody revealed
```

## Why each piece of the commitment matters

- `answer` + `salt`: hiding. The salt prevents dictionary attacks on short or
  guessable answers (without it, anyone could hash candidate answers and
  compare against on-chain commitments).
- `msg.sender`: binding to the participant. Copying someone else's commitment,
  or front-running their reveal transaction in the mempool, produces a hash
  that will never verify for the attacker's address.
- `bountyId`: prevents replaying a commitment from one bounty into another.

## What changed vs the starter

| Starter | Now |
|---|---|
| `submitAnswer(bountyId, answer)` - plaintext public immediately | `submitCommitment(bountyId, commitment)` - only a hash |
| Deadline check commented out | Enforced; plus a reveal window (`REVEAL_WINDOW = 1 days`) |
| `judgeAll` callable any time | Only after `revealDeadline`, and only if >= 1 reveal |
| `finalizeWinner` accepts any index | Rejects out-of-bounds and unrevealed indexes |
| No refund path | `reclaimReward` refunds the owner when nobody reveals |
| Multiple submissions per address | One per address (`already submitted`) |

`createBounty`, `judgeAll`, `finalizeWinner`, `getBounty` signatures are
unchanged, so the ignition module and most of the web ABI still work.
The `web/` frontend is updated to the commit/reveal flow: the commitment is
hashed client-side with a random salt (`web/src/lib/commitment.ts`), the salt
is kept in localStorage until reveal, the submissions list shows sealed
entries as commitment hashes, and judging reads `getRevealedAnswers`.

## Test plan (reveal cases)

Automated across three layers, run with `npx hardhat test` (51 passing;
`SealedVerdict.sol` at 100% line and statement coverage):

- [contracts/SealedVerdict.t.sol](contracts/SealedVerdict.t.sol) - 20 core unit tests
- [contracts/SealedVerdictDeep.t.sol](contracts/SealedVerdictDeep.t.sol) - 27 deep tests:
  exact time boundaries (commit at `deadline-1` vs `deadline`, reveal opens at
  `deadline` and closes at `revealDeadline`), size limits (2000 vs 2001 chars,
  11th submission), LLM error path (revert + retry, bounty never stuck),
  reentrancy on payout (attacker contract re-enters in `receive()`, paid
  exactly once), reward conservation, reclaim guards, cross-bounty commitment
  replay, and 3 fuzz tests (256 runs each: roundtrip for arbitrary
  answer/salt/sender, wrong salt always rejected, other sender never reveals)
- [test/SealedVerdict.integration.ts](test/SealedVerdict.integration.ts) - 4 viem
  integration tests driving the contract exactly as a frontend would
  (client-side commitment hashing, mempool-copy attack, reclaim balance
  assertion, lifecycle events)

The Ritual LLM precompile is
mocked with `vm.mockCall` at `0x0802` using the real wire format
`abi.encode(simmedInput, abi.encode(hasError, completionData, _, errorMessage, ConvoHistory))`.

| Case | Expected | Test |
|---|---|---|
| Correct answer + salt in window | Revealed, eligible | `test_reveal_success` |
| Reveal before deadline | revert `reveal not open` | `test_revert_revealBeforeDeadline` |
| Reveal after window | revert `reveal closed` | `test_revert_revealAfterWindow` |
| Wrong salt | revert `commitment mismatch` | `test_revert_wrongSalt` |
| Tampered answer | revert `commitment mismatch` | `test_revert_tamperedAnswer` |
| Reveal without commitment (incl. front-run copy) | revert `no commitment` | `test_revert_revealWithoutCommit`, `test_frontrunReveal_blocked` |
| Double reveal | revert `already revealed` | `test_revert_doubleReveal` |
| Judge before reveal window ends | revert `reveal not over` | `test_revert_judgeBeforeRevealOver` |
| Judge with zero reveals | revert `no revealed answers` | `test_revert_judgeWithNoReveals` |
| Finalize an unrevealed winner | revert `winner not revealed` | `test_revert_finalizeUnrevealedWinner` |
| Winner payout | winner receives full reward | `test_finalizeWinner_paysReward` |
| Nobody reveals | owner reclaims reward | `test_reclaimReward_whenNobodyReveals` |

Plus commit-phase cases (late commit, double commit) and the view filter
(`getRevealedAnswers` excludes hidden submissions).

## Architecture note

**Where plaintext answers exist:**
- Before reveal: only on the participant's machine (answer + salt). On-chain
  there is only the keccak256 commitment.
- After reveal: on-chain in `submissions[i].answer`, public. This is the
  inherent cost of commit-reveal - answers become public before judging, but
  only after everyone's submission is locked, so copying no longer helps.
- During judging: inside the Ritual node executing the LLM inference
  precompile, which receives the batch via `llmInput`.

**On-chain vs off-chain:**
- On-chain: commitments, deadlines, revealed answers, the AI review bytes,
  winner index, reward escrow (native token held by the contract).
- Off-chain: the salt (participant's secret), and the owner-side step that
  formats `getRevealedAnswers` output into the LLM prompt.

**How the LLM receives submissions:** one `judgeAll` call carries the entire
batch in `llmInput`; the precompile runs a single inference over all revealed
answers (not one call per answer) and the decoded completion is stored in
`aiReview` for anyone to audit against `finalizeWinner`.

**Ritual-native upgrade path (hides answers even during judging):** replace
the reveal phase with submissions encrypted to a TEE key (Ritual encrypted
secrets / DKMS precompile `0x081B`), have the enclave decrypt and batch-judge
inside `judgeAll`, and never write plaintext on-chain at all. Then the only
place plaintext ever exists is inside the TEE. The commit-reveal version here
is the chain-agnostic baseline the assignment requires; the encrypted variant
trades that portability for full hiding.

**Advanced track implementation:** this repo also implements the Ritual-native
design as [contracts/RitualHiddenBounty.sol](contracts/RitualHiddenBounty.sol)
(encrypted submissions, batch digest, TEE-attested winner, 15 tests). Flow
diagram and the full design writeup are in [ADVANCED-TRACK.md](ADVANCED-TRACK.md).

## Reflection

What should be public, what should stay hidden, and what should be decided by
AI versus by a human? The rules of the game must be public: the rubric, the
deadlines, the commitment hashes, the reward amount, and the AI's review, so
that any participant can verify the process without trusting the organizer.
The answer itself must stay hidden until every submission is locked, because
early visibility lets latecomers copy and improve; the salt never needs to
leave the participant's machine. After the reveal window, answers become
public as the price of verifiability. The AI is the right judge for scoring:
comparing ten answers against a rubric is exactly the kind of consistent,
bias-resistant evaluation a model does well, and running it as one on-chain
batch call makes the verdict reproducible. But a human should keep the final
finalize step and the rubric authorship, because models can be prompt-injected
by submission text and cannot be held accountable for paying out real money.
That split - AI proposes, human ratifies, chain enforces - is what the
`judgeAll` / `finalizeWinner` separation encodes.
