// End-to-end integration test through the public API, exactly as a frontend
// would drive it: compute commitments client-side with viem, commit, warp,
// reveal, and read views. (judgeAll needs the Ritual LLM precompile, which
// only exists on Ritual chain — its logic is covered by the Solidity tests
// via vm.mockCall.)
import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keccak256, encodePacked, parseEther, toHex } from "viem";

describe("AIJudge commit-reveal integration", async () => {
  const { viem, networkHelpers } = await network.create();
  const [owner, alice, bob, carol] = await viem.getWalletClients();

  const commitmentFor = (
    answer: string,
    salt: `0x${string}`,
    sender: `0x${string}`,
    bountyId: bigint,
  ) =>
    keccak256(
      encodePacked(
        ["string", "bytes32", "address", "uint256"],
        [answer, salt, sender, bountyId],
      ),
    );

  async function deployWithBounty() {
    const judge = await viem.deployContract("AIJudge");
    const now = BigInt(await networkHelpers.time.latest());
    const deadline = now + 3600n;
    await judge.write.createBounty(["Title", "Rubric", deadline], {
      value: parseEther("1"),
      account: owner.account,
    });
    return { judge, deadline, bountyId: 1n };
  }

  it("full happy path: commit -> reveal -> views", async () => {
    const { judge, deadline, bountyId } = await networkHelpers.loadFixture(
      deployWithBounty,
    );

    const saltA = toHex("salt-alice", { size: 32 });
    const saltB = toHex("salt-bob", { size: 32 });
    const ansA = "detailed correct answer";
    const ansB = "short answer";

    // commit phase: only hashes go on-chain
    for (const [w, ans, salt] of [
      [alice, ansA, saltA],
      [bob, ansB, saltB],
    ] as const) {
      await judge.write.submitCommitment(
        [bountyId, commitmentFor(ans, salt, w.account.address, bountyId)],
        { account: w.account },
      );
    }

    // answers are hidden during commit phase
    const hidden = await judge.read.getSubmission([bountyId, 0n]);
    assert.equal(hidden[2], ""); // answer field empty
    assert.equal(hidden[3], false); // not revealed

    // reveal phase
    await networkHelpers.time.increaseTo(deadline);
    await judge.write.revealAnswer([bountyId, ansA, saltA], {
      account: alice.account,
    });
    await judge.write.revealAnswer([bountyId, ansB, saltB], {
      account: bob.account,
    });

    const [indexes, submitters, answers] = await judge.read.getRevealedAnswers(
      [bountyId],
    );
    assert.equal(answers.length, 2);
    assert.deepEqual([...indexes], [0n, 1n]);
    assert.equal(answers[0], ansA);
    assert.equal(
      submitters[0].toLowerCase(),
      alice.account.address.toLowerCase(),
    );
  });

  it("rejects a copied reveal from another wallet", async () => {
    const { judge, deadline, bountyId } = await networkHelpers.loadFixture(
      deployWithBounty,
    );
    const salt = toHex("s", { size: 32 });
    await judge.write.submitCommitment(
      [bountyId, commitmentFor("secret", salt, alice.account.address, bountyId)],
      { account: alice.account },
    );
    await networkHelpers.time.increaseTo(deadline);

    // carol saw alice's reveal tx in the mempool and copies answer + salt
    await viem.assertions.revertWith(
      judge.write.revealAnswer([bountyId, "secret", salt], {
        account: carol.account,
      }),
      "no commitment",
    );
  });

  it("owner reclaims reward when nobody reveals", async () => {
    const { judge, deadline, bountyId } = await networkHelpers.loadFixture(
      deployWithBounty,
    );
    const salt = toHex("s", { size: 32 });
    await judge.write.submitCommitment(
      [bountyId, commitmentFor("a", salt, alice.account.address, bountyId)],
      { account: alice.account },
    );

    const revealWindow = await judge.read.REVEAL_WINDOW();
    await networkHelpers.time.increaseTo(deadline + revealWindow);

    await viem.assertions.balancesHaveChanged(
      judge.write.reclaimReward([bountyId], { account: owner.account }),
      [
        {
          address: owner.account.address,
          amount: parseEther("1"),
        },
      ],
    );
  });

  it("emits the right events across the lifecycle", async () => {
    const { judge, deadline, bountyId } = await networkHelpers.loadFixture(
      deployWithBounty,
    );
    const salt = toHex("s", { size: 32 });

    await viem.assertions.emitWithArgs(
      judge.write.submitCommitment(
        [bountyId, commitmentFor("a", salt, alice.account.address, bountyId)],
        { account: alice.account },
      ),
      judge,
      "CommitmentSubmitted",
      [
        bountyId,
        0n,
        (a: string) =>
          a.toLowerCase() === alice.account.address.toLowerCase(),
        commitmentFor("a", salt, alice.account.address, bountyId),
      ],
    );

    await networkHelpers.time.increaseTo(deadline);
    await viem.assertions.emit(
      judge.write.revealAnswer([bountyId, "a", salt], {
        account: alice.account,
      }),
      judge,
      "AnswerRevealed",
    );
  });
});
