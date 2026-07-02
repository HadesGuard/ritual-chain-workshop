// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RitualHiddenBounty} from "./RitualHiddenBounty.sol";

contract RitualHiddenBountyTest is Test {
    RitualHiddenBounty public bounty;

    address owner = address(0x1);
    address alice = address(0x2);
    address bob   = address(0x3);
    address carol = address(0x4);

    uint256 teePk;
    address teeSigner;
    uint256 roguePk;
    address rogueSigner;

    uint256 bountyId;
    uint256 deadline;

    function setUp() public {
        bounty = new RitualHiddenBounty();
        (teeSigner, teePk)     = makeAddrAndKey("tee-enclave");
        (rogueSigner, roguePk) = makeAddrAndKey("rogue");
        deadline = block.timestamp + 1 days;

        vm.prank(owner);
        bountyId = bounty.createBounty(teeSigner, hex"04deadbeef", deadline);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function _submit(address who, bytes memory ciphertext) internal {
        vm.prank(who);
        bounty.submitEncrypted(bountyId, ciphertext);
    }

    function _teeSign(uint256 pk, uint256 winnerIndex) internal view returns (bytes memory) {
        bytes32 message = keccak256(abi.encodePacked(bounty.batchDigest(bountyId), winnerIndex));
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, ethHash);
        return abi.encodePacked(r, s, v);
    }

    function _toJudging() internal {
        vm.warp(deadline + 1);
        vm.prank(owner);
        bounty.requestBatchJudging(bountyId);
    }

    // -------------------------------------------------------------------------
    // Submission
    // -------------------------------------------------------------------------

    function test_submitEncrypted_storesHashOnly() public {
        bytes memory ct = hex"aabbccdd";
        _submit(alice, ct);
        (address sub, bytes32 h) = bounty.submissions(bountyId, 0);
        assertEq(sub, alice);
        assertEq(h, keccak256(ct));
    }

    function test_revert_submitAfterDeadline() public {
        vm.warp(deadline + 1);
        vm.prank(alice);
        vm.expectRevert(RitualHiddenBounty.SubmissionPhaseClosed.selector);
        bounty.submitEncrypted(bountyId, hex"aa");
    }

    function test_revert_doubleSubmit() public {
        _submit(alice, hex"aa");
        vm.prank(alice);
        vm.expectRevert(RitualHiddenBounty.AlreadySubmitted.selector);
        bounty.submitEncrypted(bountyId, hex"bb");
    }

    function test_revert_emptyCiphertext() public {
        vm.prank(alice);
        vm.expectRevert(RitualHiddenBounty.EmptyCiphertext.selector);
        bounty.submitEncrypted(bountyId, "");
    }

    // -------------------------------------------------------------------------
    // Judging kickoff
    // -------------------------------------------------------------------------

    function test_requestBatchJudging() public {
        _submit(alice, hex"aa");
        vm.warp(deadline + 1);
        vm.prank(owner);
        bounty.requestBatchJudging(bountyId);
        (,,,, RitualHiddenBounty.Phase phase,,) = bounty.bounties(bountyId);
        assertEq(uint8(phase), uint8(RitualHiddenBounty.Phase.Judging));
    }

    function test_revert_requestJudging_notOwner() public {
        vm.warp(deadline + 1);
        vm.prank(alice);
        vm.expectRevert(RitualHiddenBounty.NotBountyOwner.selector);
        bounty.requestBatchJudging(bountyId);
    }

    function test_revert_requestJudging_beforeDeadline() public {
        vm.prank(owner);
        vm.expectRevert(RitualHiddenBounty.SubmissionPhaseNotClosed.selector);
        bounty.requestBatchJudging(bountyId);
    }

    // -------------------------------------------------------------------------
    // Attested winner
    // -------------------------------------------------------------------------

    function test_submitAttestedWinner_success() public {
        _submit(alice, hex"aa");
        _submit(bob,   hex"bb");
        _toJudging();

        bytes memory sig = _teeSign(teePk, 1); // bob wins
        // anyone can relay the TEE's judgment
        vm.prank(carol);
        bounty.submitAttestedWinner(bountyId, 1, sig);

        (,,,,, uint256 winnerIndex, bool winnerSet) = bounty.bounties(bountyId);
        assertTrue(winnerSet);
        assertEq(winnerIndex, 1);
    }

    function test_revert_rogueSignature() public {
        _submit(alice, hex"aa");
        _toJudging();
        bytes memory sig = _teeSign(roguePk, 0);
        vm.expectRevert(RitualHiddenBounty.InvalidAttestation.selector);
        bounty.submitAttestedWinner(bountyId, 0, sig);
    }

    function test_revert_signatureForDifferentWinner() public {
        _submit(alice, hex"aa");
        _submit(bob,   hex"bb");
        _toJudging();
        // TEE signed winner 0, relayer tries to claim winner 1
        bytes memory sig = _teeSign(teePk, 0);
        vm.expectRevert(RitualHiddenBounty.InvalidAttestation.selector);
        bounty.submitAttestedWinner(bountyId, 1, sig);
    }

    function test_revert_beforeJudgingPhase() public {
        _submit(alice, hex"aa");
        bytes memory sig = _teeSign(teePk, 0);
        vm.expectRevert(RitualHiddenBounty.NotJudging.selector);
        bounty.submitAttestedWinner(bountyId, 0, sig);
    }

    function test_revert_winnerIndexOutOfBounds() public {
        _submit(alice, hex"aa");
        _toJudging();
        bytes memory sig = _teeSign(teePk, 5);
        vm.expectRevert(RitualHiddenBounty.InvalidWinnerIndex.selector);
        bounty.submitAttestedWinner(bountyId, 5, sig);
    }

    function test_revert_doubleFinalize() public {
        _submit(alice, hex"aa");
        _toJudging();
        bytes memory sig = _teeSign(teePk, 0);
        bounty.submitAttestedWinner(bountyId, 0, sig);
        vm.expectRevert(RitualHiddenBounty.NotJudging.selector);
        bounty.submitAttestedWinner(bountyId, 0, sig);
    }

    // Digest binds the exact submission set: a signature over one set is invalid
    // for a different set (simulated across two bounties with different subs).
    function test_digestBindsSubmissionSet() public {
        _submit(alice, hex"aa");
        bytes32 d1 = bounty.batchDigest(bountyId);
        _submit(bob, hex"bb");
        bytes32 d2 = bounty.batchDigest(bountyId);
        assertTrue(d1 != d2);
    }

    function test_malformedSignatureRejected() public {
        _submit(alice, hex"aa");
        _toJudging();
        vm.expectRevert(RitualHiddenBounty.InvalidAttestation.selector);
        bounty.submitAttestedWinner(bountyId, 0, hex"deadbeef"); // wrong length
    }
}
