// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AIJudge} from "./AIJudge.sol";

/// Reenters finalizeWinner when receiving the reward payout.
contract ReentrantWinner {
    AIJudge judge;
    uint256 bountyId;
    bool reentered;

    constructor(AIJudge _judge) {
        judge = _judge;
    }

    function commit(uint256 _bountyId, bytes32 c) external {
        bountyId = _bountyId;
        judge.submitCommitment(_bountyId, c);
    }

    function reveal(string calldata answer, bytes32 salt) external {
        judge.revealAnswer(bountyId, answer, salt);
    }

    receive() external payable {
        if (!reentered) {
            reentered = true;
            // second payout attempt must fail: finalized is set before transfer
            try judge.finalizeWinner(bountyId, 0) {
                revert("reentrancy succeeded");
            } catch {}
        }
    }
}

contract AIJudgeDeepTest is Test {
    AIJudge judge;

    address owner = address(0x1);
    address alice = address(0x2);
    address bob = address(0x3);

    uint256 bountyId;
    uint256 deadline;
    uint256 constant REWARD = 1 ether;
    address constant LLM = address(0x0802);

    function setUp() public {
        judge = new AIJudge();
        deadline = block.timestamp + 1 days;
        vm.deal(owner, 100 ether);
        vm.prank(owner);
        bountyId = judge.createBounty{value: REWARD}("t", "r", deadline);
    }

    function _commitmentFor(
        address who,
        uint256 id,
        string memory answer,
        bytes32 salt
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(answer, salt, who, id));
    }

    function _commit(address who, string memory answer, bytes32 salt) internal {
        vm.prank(who);
        judge.submitCommitment(
            bountyId,
            _commitmentFor(who, bountyId, answer, salt)
        );
    }

    function _reveal(address who, string memory answer, bytes32 salt) internal {
        vm.prank(who);
        judge.revealAnswer(bountyId, answer, salt);
    }

    function _mockLLMOk(bytes memory llmInput) internal {
        bytes memory actualOutput = abi.encode(
            false,
            bytes("review"),
            bytes(""),
            "",
            AIJudge.ConvoHistory("", "", "")
        );
        vm.mockCall(LLM, llmInput, abi.encode(bytes(""), actualOutput));
    }

    function _mockLLMError(bytes memory llmInput, string memory msg_) internal {
        bytes memory actualOutput = abi.encode(
            true,
            bytes(""),
            bytes(""),
            msg_,
            AIJudge.ConvoHistory("", "", "")
        );
        vm.mockCall(LLM, llmInput, abi.encode(bytes(""), actualOutput));
    }

    // ------------------------------------------------------------------
    // Time boundaries (exact timestamps)
    // ------------------------------------------------------------------

    function test_boundary_commitAtDeadlineMinusOne() public {
        vm.warp(deadline - 1);
        _commit(alice, "a", "s"); // must succeed
    }

    function test_boundary_commitExactlyAtDeadline_reverts() public {
        vm.warp(deadline);
        vm.prank(alice);
        vm.expectRevert(bytes("submissions closed"));
        judge.submitCommitment(bountyId, bytes32(uint256(1)));
    }

    function test_boundary_revealExactlyAtDeadline() public {
        _commit(alice, "a", "s");
        vm.warp(deadline);
        _reveal(alice, "a", "s"); // reveal opens exactly at deadline
    }

    function test_boundary_revealAtWindowEndMinusOne() public {
        _commit(alice, "a", "s");
        vm.warp(deadline + judge.REVEAL_WINDOW() - 1);
        _reveal(alice, "a", "s");
    }

    function test_boundary_revealExactlyAtWindowEnd_reverts() public {
        _commit(alice, "a", "s");
        vm.warp(deadline + judge.REVEAL_WINDOW());
        vm.prank(alice);
        vm.expectRevert(bytes("reveal closed"));
        judge.revealAnswer(bountyId, "a", "s");
    }

    function test_boundary_judgeExactlyAtWindowEnd() public {
        _commit(alice, "a", "s");
        vm.warp(deadline);
        _reveal(alice, "a", "s");
        vm.warp(deadline + judge.REVEAL_WINDOW());
        _mockLLMOk(bytes("x"));
        vm.prank(owner);
        judge.judgeAll(bountyId, bytes("x")); // opens exactly at revealDeadline
    }

    // ------------------------------------------------------------------
    // Size limits
    // ------------------------------------------------------------------

    function test_answerAtMaxLength_ok() public {
        string memory ans = new string(judge.MAX_ANSWER_LENGTH());
        _commit(alice, ans, "s");
        vm.warp(deadline);
        _reveal(alice, ans, "s");
    }

    function test_answerOverMaxLength_reverts() public {
        string memory ans = new string(judge.MAX_ANSWER_LENGTH() + 1);
        _commit(alice, ans, "s");
        vm.warp(deadline);
        vm.prank(alice);
        vm.expectRevert(bytes("answer too long"));
        judge.revealAnswer(bountyId, ans, "s");
    }

    function test_maxSubmissions_capEnforced() public {
        for (uint256 i = 0; i < judge.MAX_SUBMISSIONS(); i++) {
            address who = address(uint160(0x1000 + i));
            vm.prank(who);
            judge.submitCommitment(bountyId, bytes32(i + 1));
        }
        vm.prank(address(0xdead));
        vm.expectRevert(bytes("too many submissions"));
        judge.submitCommitment(bountyId, bytes32(uint256(99)));
    }

    function test_revert_zeroCommitment() public {
        vm.prank(alice);
        vm.expectRevert(bytes("empty commitment"));
        judge.submitCommitment(bountyId, bytes32(0));
    }

    function test_emptyAnswer_revealsIfCommitted() public {
        // an empty answer is a valid (if useless) commitment target
        _commit(alice, "", "s");
        vm.warp(deadline);
        _reveal(alice, "", "s");
        assertEq(judge.revealedCount(bountyId), 1);
    }

    // ------------------------------------------------------------------
    // createBounty guards
    // ------------------------------------------------------------------

    function test_revert_createWithoutReward() public {
        vm.prank(owner);
        vm.expectRevert(bytes("reward required"));
        judge.createBounty("t", "r", block.timestamp + 1);
    }

    function test_revert_createWithPastDeadline() public {
        vm.prank(owner);
        vm.expectRevert(bytes("deadline in past"));
        judge.createBounty{value: 1}("t", "r", block.timestamp);
    }

    // ------------------------------------------------------------------
    // LLM error path
    // ------------------------------------------------------------------

    function test_llmError_revertsAndAllowsRetry() public {
        _commit(alice, "a", "s");
        vm.warp(deadline);
        _reveal(alice, "a", "s");
        vm.warp(deadline + judge.REVEAL_WINDOW());

        _mockLLMError(bytes("bad input"), "model unavailable");
        vm.prank(owner);
        vm.expectRevert(bytes("model unavailable"));
        judge.judgeAll(bountyId, bytes("bad input"));

        // bounty not stuck: judged stayed false, retry with a good call works
        _mockLLMOk(bytes("good input"));
        vm.prank(owner);
        judge.judgeAll(bountyId, bytes("good input"));
        (, , , , , bool judged, , , , ) = judge.getBounty(bountyId);
        assertTrue(judged);
    }

    function test_revert_doubleJudge() public {
        _commit(alice, "a", "s");
        vm.warp(deadline);
        _reveal(alice, "a", "s");
        vm.warp(deadline + judge.REVEAL_WINDOW());
        _mockLLMOk(bytes("x"));
        vm.startPrank(owner);
        judge.judgeAll(bountyId, bytes("x"));
        vm.expectRevert(bytes("already judged"));
        judge.judgeAll(bountyId, bytes("x"));
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Money safety
    // ------------------------------------------------------------------

    function test_rewardConservation_afterFinalize() public {
        _commit(alice, "a", "s");
        vm.warp(deadline);
        _reveal(alice, "a", "s");
        vm.warp(deadline + judge.REVEAL_WINDOW());
        _mockLLMOk(bytes("x"));
        vm.startPrank(owner);
        judge.judgeAll(bountyId, bytes("x"));
        judge.finalizeWinner(bountyId, 0);
        vm.stopPrank();

        assertEq(address(judge).balance, 0);
        (, , , uint256 reward, , , , , , ) = judge.getBounty(bountyId);
        assertEq(reward, 0);
    }

    function test_reentrancyOnPayout_blocked() public {
        ReentrantWinner attacker = new ReentrantWinner(judge);
        bytes32 c = _commitmentFor(address(attacker), bountyId, "a", "s");
        attacker.commit(bountyId, c);
        vm.warp(deadline);
        attacker.reveal("a", "s");
        vm.warp(deadline + judge.REVEAL_WINDOW());
        _mockLLMOk(bytes("x"));
        vm.startPrank(owner);
        judge.judgeAll(bountyId, bytes("x"));
        judge.finalizeWinner(bountyId, 0); // receive() tries to re-enter
        vm.stopPrank();

        // paid exactly once
        assertEq(address(attacker).balance, REWARD);
        assertEq(address(judge).balance, 0);
    }

    function test_revert_reclaimBeforeWindowEnds() public {
        vm.prank(owner);
        vm.expectRevert(bytes("reveal not over"));
        judge.reclaimReward(bountyId);
    }

    function test_revert_reclaimWhenSomeoneRevealed() public {
        _commit(alice, "a", "s");
        vm.warp(deadline);
        _reveal(alice, "a", "s");
        vm.warp(deadline + judge.REVEAL_WINDOW());
        vm.prank(owner);
        vm.expectRevert(bytes("answers were revealed"));
        judge.reclaimReward(bountyId);
    }

    function test_revert_judgeAfterReclaim() public {
        _commit(alice, "a", "s"); // never revealed
        vm.warp(deadline + judge.REVEAL_WINDOW());
        vm.startPrank(owner);
        judge.reclaimReward(bountyId);
        vm.expectRevert(bytes("already finalized"));
        judge.judgeAll(bountyId, bytes("x"));
        vm.stopPrank();
    }

    function test_revert_doubleReclaim() public {
        vm.warp(deadline + judge.REVEAL_WINDOW());
        vm.startPrank(owner);
        judge.reclaimReward(bountyId);
        vm.expectRevert(bytes("already finalized"));
        judge.reclaimReward(bountyId);
        vm.stopPrank();
    }

    function test_revert_reclaim_notOwner() public {
        vm.warp(deadline + judge.REVEAL_WINDOW());
        vm.prank(alice);
        vm.expectRevert(bytes("not bounty owner"));
        judge.reclaimReward(bountyId);
    }

    // ------------------------------------------------------------------
    // Multi-bounty isolation
    // ------------------------------------------------------------------

    function test_bountyIsolation() public {
        vm.prank(owner);
        uint256 b2 = judge.createBounty{value: 2 ether}(
            "t2",
            "r2",
            deadline + 7 days
        );

        _commit(alice, "answer-1", "s");
        // same answer+salt committed to bounty 2 hashes differently
        bytes32 c2 = _commitmentFor(alice, b2, "answer-1", "s");
        vm.prank(alice);
        judge.submitCommitment(b2, c2);

        // b1 commitment cannot be revealed against b2's id and vice versa:
        // both hashes bind their own bountyId, so cross-reveal mismatches
        vm.warp(deadline);
        _reveal(alice, "answer-1", "s"); // b1 ok

        (, , , , , , , uint256 count1, , ) = judge.getBounty(bountyId);
        (, , , , , , , uint256 count2, , ) = judge.getBounty(b2);
        assertEq(count1, 1);
        assertEq(count2, 1);
        assertEq(judge.revealedCount(bountyId), 1);
        assertEq(judge.revealedCount(b2), 0);
    }

    function test_crossBountyCommitmentReplay_failsReveal() public {
        // bob copies alice's b1 commitment into a second bounty
        vm.prank(owner);
        uint256 b2 = judge.createBounty{value: 1 ether}(
            "t2",
            "r2",
            deadline
        );
        bytes32 aliceC = _commitmentFor(alice, bountyId, "answer", "s");
        vm.prank(bob);
        judge.submitCommitment(b2, aliceC);

        vm.warp(deadline);
        // even knowing the plaintext + salt, bob's reveal on b2 hashes with
        // (bob, b2) and cannot match alice's (alice, b1) commitment
        vm.prank(bob);
        vm.expectRevert(bytes("commitment mismatch"));
        judge.revealAnswer(b2, "answer", "s");
    }

    // ------------------------------------------------------------------
    // Fuzz
    // ------------------------------------------------------------------

    function testFuzz_commitRevealRoundtrip(
        string memory answer,
        bytes32 salt,
        address who
    ) public {
        vm.assume(who != address(0));
        vm.assume(bytes(answer).length <= judge.MAX_ANSWER_LENGTH());

        vm.prank(who);
        judge.submitCommitment(
            bountyId,
            _commitmentFor(who, bountyId, answer, salt)
        );
        vm.warp(deadline);
        vm.prank(who);
        judge.revealAnswer(bountyId, answer, salt);
        assertEq(judge.revealedCount(bountyId), 1);
    }

    function testFuzz_wrongSaltAlwaysRejected(
        bytes32 salt,
        bytes32 wrongSalt
    ) public {
        vm.assume(salt != wrongSalt);
        _commit(alice, "fixed answer", salt);
        vm.warp(deadline);
        vm.prank(alice);
        vm.expectRevert(bytes("commitment mismatch"));
        judge.revealAnswer(bountyId, "fixed answer", wrongSalt);
    }

    function testFuzz_otherSenderNeverReveals(address thief) public {
        vm.assume(thief != alice && thief != address(0));
        _commit(alice, "secret", "s");
        vm.warp(deadline);
        vm.prank(thief);
        vm.expectRevert(bytes("no commitment"));
        judge.revealAnswer(bountyId, "secret", "s");
    }
}
