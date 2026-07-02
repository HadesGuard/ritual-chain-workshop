// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AIJudge} from "./AIJudge.sol";

contract AIJudgeTest is Test {
    AIJudge judge;

    address owner = address(0x1);
    address alice = address(0x2);
    address bob = address(0x3);
    address carol = address(0x4);

    uint256 bountyId;
    uint256 deadline;
    uint256 constant REWARD = 1 ether;

    address constant LLM = address(0x0802);

    function setUp() public {
        judge = new AIJudge();
        deadline = block.timestamp + 1 days;

        vm.deal(owner, 10 ether);
        vm.prank(owner);
        bountyId = judge.createBounty{value: REWARD}(
            "Best privacy design",
            "Judge on correctness and clarity",
            deadline
        );
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    function _commitmentOf(
        address who,
        string memory answer,
        bytes32 salt
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(answer, salt, who, bountyId));
    }

    function _commit(address who, string memory answer, bytes32 salt) internal {
        vm.prank(who);
        judge.submitCommitment(bountyId, _commitmentOf(who, answer, salt));
    }

    function _reveal(address who, string memory answer, bytes32 salt) internal {
        vm.prank(who);
        judge.revealAnswer(bountyId, answer, salt);
    }

    function _warpToReveal() internal {
        vm.warp(deadline);
    }

    function _warpToJudging() internal {
        vm.warp(deadline + judge.REVEAL_WINDOW());
    }

    /// Mock the Ritual LLM precompile response for a given llmInput.
    function _mockLLM(bytes memory llmInput, bytes memory completion) internal {
        // inner payload: (hasError, completionData, _, errorMessage, ConvoHistory)
        bytes memory actualOutput = abi.encode(
            false,
            completion,
            bytes(""),
            "",
            AIJudge.ConvoHistory("", "", "")
        );
        // precompile raw output: (simmedInput, actualOutput)
        vm.mockCall(LLM, llmInput, abi.encode(bytes(""), actualOutput));
    }

    function _judge(bytes memory llmInput) internal {
        _mockLLM(llmInput, bytes('{"winnerIndex":0}'));
        vm.prank(owner);
        judge.judgeAll(bountyId, llmInput);
    }

    // ------------------------------------------------------------------
    // Commit phase
    // ------------------------------------------------------------------

    function test_submitCommitment() public {
        _commit(alice, "my answer", "salt1");
        (, bytes32 c, string memory ans, bool revealed) = judge.getSubmission(
            bountyId,
            0
        );
        assertEq(c, _commitmentOf(alice, "my answer", "salt1"));
        assertEq(bytes(ans).length, 0); // answer hidden during commit phase
        assertFalse(revealed);
    }

    function test_revert_commitAfterDeadline() public {
        vm.warp(deadline);
        vm.prank(alice);
        vm.expectRevert(bytes("submissions closed"));
        judge.submitCommitment(bountyId, bytes32(uint256(1)));
    }

    function test_revert_doubleCommit() public {
        _commit(alice, "a", "s");
        vm.prank(alice);
        vm.expectRevert(bytes("already submitted"));
        judge.submitCommitment(bountyId, bytes32(uint256(2)));
    }

    // ------------------------------------------------------------------
    // Reveal phase
    // ------------------------------------------------------------------

    function test_reveal_success() public {
        _commit(alice, "correct answer", "mysalt");
        _warpToReveal();
        _reveal(alice, "correct answer", "mysalt");

        (, , string memory ans, bool revealed) = judge.getSubmission(
            bountyId,
            0
        );
        assertEq(ans, "correct answer");
        assertTrue(revealed);
        assertEq(judge.revealedCount(bountyId), 1);
    }

    function test_revert_revealBeforeDeadline() public {
        _commit(alice, "a", "s");
        vm.prank(alice);
        vm.expectRevert(bytes("reveal not open"));
        judge.revealAnswer(bountyId, "a", "s");
    }

    function test_revert_revealAfterWindow() public {
        _commit(alice, "a", "s");
        _warpToJudging();
        vm.prank(alice);
        vm.expectRevert(bytes("reveal closed"));
        judge.revealAnswer(bountyId, "a", "s");
    }

    function test_revert_wrongSalt() public {
        _commit(alice, "a", "correct-salt");
        _warpToReveal();
        vm.prank(alice);
        vm.expectRevert(bytes("commitment mismatch"));
        judge.revealAnswer(bountyId, "a", "wrong-salt");
    }

    function test_revert_tamperedAnswer() public {
        _commit(alice, "real answer", "s");
        _warpToReveal();
        vm.prank(alice);
        vm.expectRevert(bytes("commitment mismatch"));
        judge.revealAnswer(bountyId, "tampered", "s");
    }

    function test_revert_revealWithoutCommit() public {
        _warpToReveal();
        vm.prank(carol);
        vm.expectRevert(bytes("no commitment"));
        judge.revealAnswer(bountyId, "stolen", "s");
    }

    function test_revert_doubleReveal() public {
        _commit(alice, "a", "s");
        _warpToReveal();
        _reveal(alice, "a", "s");
        vm.prank(alice);
        vm.expectRevert(bytes("already revealed"));
        judge.revealAnswer(bountyId, "a", "s");
    }

    // Commitment binds msg.sender: carol cannot reveal alice's answer even if
    // she copies the plaintext + salt from the mempool.
    function test_frontrunReveal_blocked() public {
        _commit(alice, "secret", "s");
        _warpToReveal();
        vm.prank(carol);
        vm.expectRevert(bytes("no commitment"));
        judge.revealAnswer(bountyId, "secret", "s");
    }

    // ------------------------------------------------------------------
    // Judging (LLM precompile mocked)
    // ------------------------------------------------------------------

    function test_judgeAll_afterRevealWindow() public {
        _commit(alice, "a", "s");
        _warpToReveal();
        _reveal(alice, "a", "s");
        _warpToJudging();

        _judge(bytes("batch prompt"));
        (, , , , , bool judged, , , , bytes memory review) = judge.getBounty(
            bountyId
        );
        assertTrue(judged);
        assertEq(review, bytes('{"winnerIndex":0}'));
    }

    function test_revert_judgeBeforeRevealOver() public {
        _commit(alice, "a", "s");
        _warpToReveal();
        _reveal(alice, "a", "s");
        vm.prank(owner);
        vm.expectRevert(bytes("reveal not over"));
        judge.judgeAll(bountyId, bytes("x"));
    }

    function test_revert_judgeWithNoReveals() public {
        _commit(alice, "a", "s"); // never revealed
        _warpToJudging();
        vm.prank(owner);
        vm.expectRevert(bytes("no revealed answers"));
        judge.judgeAll(bountyId, bytes("x"));
    }

    function test_revert_judge_notOwner() public {
        _commit(alice, "a", "s");
        _warpToReveal();
        _reveal(alice, "a", "s");
        _warpToJudging();
        vm.prank(alice);
        vm.expectRevert(bytes("not bounty owner"));
        judge.judgeAll(bountyId, bytes("x"));
    }

    // ------------------------------------------------------------------
    // Finalization + payout
    // ------------------------------------------------------------------

    function test_finalizeWinner_paysReward() public {
        _commit(alice, "great answer", "s1");
        _commit(bob, "ok answer", "s2");
        _warpToReveal();
        _reveal(alice, "great answer", "s1");
        _reveal(bob, "ok answer", "s2");
        _warpToJudging();
        _judge(bytes("batch"));

        uint256 before = alice.balance;
        vm.prank(owner);
        judge.finalizeWinner(bountyId, 0);
        assertEq(alice.balance - before, REWARD);
    }

    function test_revert_finalizeUnrevealedWinner() public {
        _commit(alice, "a", "s1");
        _commit(bob, "b", "s2"); // bob never reveals
        _warpToReveal();
        _reveal(alice, "a", "s1");
        _warpToJudging();
        _judge(bytes("batch"));

        vm.prank(owner);
        vm.expectRevert(bytes("winner not revealed"));
        judge.finalizeWinner(bountyId, 1);
    }

    function test_revert_doubleFinalize() public {
        _commit(alice, "a", "s");
        _warpToReveal();
        _reveal(alice, "a", "s");
        _warpToJudging();
        _judge(bytes("batch"));

        vm.startPrank(owner);
        judge.finalizeWinner(bountyId, 0);
        vm.expectRevert(bytes("already finalized"));
        judge.finalizeWinner(bountyId, 0);
        vm.stopPrank();
    }

    function test_reclaimReward_whenNobodyReveals() public {
        _commit(alice, "a", "s"); // never revealed
        _warpToJudging();

        uint256 before = owner.balance;
        vm.prank(owner);
        judge.reclaimReward(bountyId);
        assertEq(owner.balance - before, REWARD);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function test_getRevealedAnswers_excludesHidden() public {
        _commit(alice, "revealed answer", "s1");
        _commit(bob, "hidden answer", "s2");
        _warpToReveal();
        _reveal(alice, "revealed answer", "s1");

        (
            uint256[] memory indexes,
            address[] memory submitters,
            string[] memory answers
        ) = judge.getRevealedAnswers(bountyId);

        assertEq(answers.length, 1);
        assertEq(indexes[0], 0);
        assertEq(submitters[0], alice);
        assertEq(answers[0], "revealed answer");
    }
}
