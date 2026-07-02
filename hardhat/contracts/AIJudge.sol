// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PrecompileConsumer} from "./utils/PrecompileConsumer.sol";

interface IRitualWallet {
    function deposit(uint256 lockDuration) external payable;

    function depositFor(address user, uint256 lockDuration) external payable;

    function withdraw(uint256 amount) external;

    function balanceOf(address) external view returns (uint256);

    function lockUntil(address) external view returns (uint256);
}

/// @dev Commit-reveal AI bounty judge.
///
///      Answers stay hidden during the submission phase: participants submit only
///      commitment = keccak256(abi.encodePacked(answer, salt, msg.sender, bountyId)).
///      After the submission deadline they reveal (answer, salt); the contract
///      verifies the commitment. Only verified reveals are eligible for the
///      Ritual LLM batch judging and for winning.
contract AIJudge is PrecompileConsumer {
    uint256 public constant MAX_SUBMISSIONS = 10;
    uint256 public constant MAX_ANSWER_LENGTH = 2_000;
    uint256 public constant REVEAL_WINDOW = 1 days;

    uint256 public nextBountyId = 1;

    IRitualWallet wallet =
        IRitualWallet(0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948);

    struct Submission {
        address submitter;
        bytes32 commitment;
        string answer; // empty until revealed
        bool revealed;
    }

    struct Bounty {
        address owner;
        string title;
        string rubric;
        uint256 reward;
        uint256 deadline; // end of commit phase
        uint256 revealDeadline; // end of reveal phase (deadline + REVEAL_WINDOW)
        bool judged;
        bool finalized;
        bytes aiReview;
        uint256 winnerIndex;
        Submission[] submissions;
    }

    struct ConvoHistory {
        string storageType;
        string path;
        string secretsName;
    }

    mapping(uint256 => Bounty) public bounties;
    // bountyId => submitter => submission index + 1 (0 = none)
    mapping(uint256 => mapping(address => uint256)) private submissionIndex;

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed owner,
        string title,
        uint256 reward,
        uint256 deadline
    );

    event CommitmentSubmitted(
        uint256 indexed bountyId,
        uint256 indexed submissionIndex,
        address indexed submitter,
        bytes32 commitment
    );

    event AnswerRevealed(
        uint256 indexed bountyId,
        uint256 indexed submissionIndex,
        address indexed submitter
    );

    event AllAnswersJudged(uint256 indexed bountyId, bytes aiReview);

    event WinnerFinalized(
        uint256 indexed bountyId,
        uint256 indexed winnerIndex,
        address indexed winner,
        uint256 reward
    );

    modifier onlyOwner(uint256 bountyId) {
        require(msg.sender == bounties[bountyId].owner, "not bounty owner");
        _;
    }

    modifier bountyExists(uint256 bountyId) {
        require(bounties[bountyId].owner != address(0), "bounty not found");
        _;
    }

    function createBounty(
        string calldata title,
        string calldata rubric,
        uint256 deadline
    ) external payable returns (uint256 bountyId) {
        require(msg.value > 0, "reward required");
        require(deadline > block.timestamp, "deadline in past");

        bountyId = nextBountyId++;

        Bounty storage bounty = bounties[bountyId];

        bounty.owner = msg.sender;
        bounty.title = title;
        bounty.rubric = rubric;
        bounty.reward = msg.value;
        bounty.deadline = deadline;
        bounty.revealDeadline = deadline + REVEAL_WINDOW;
        bounty.winnerIndex = type(uint256).max;

        emit BountyCreated(bountyId, msg.sender, title, msg.value, deadline);
    }

    /// @notice Commit phase: submit only the hash of your answer.
    ///         commitment = keccak256(abi.encodePacked(answer, salt, msg.sender, bountyId))
    function submitCommitment(
        uint256 bountyId,
        bytes32 commitment
    ) external bountyExists(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(block.timestamp < bounty.deadline, "submissions closed");
        require(
            bounty.submissions.length < MAX_SUBMISSIONS,
            "too many submissions"
        );
        require(
            submissionIndex[bountyId][msg.sender] == 0,
            "already submitted"
        );
        require(commitment != bytes32(0), "empty commitment");

        bounty.submissions.push(
            Submission({
                submitter: msg.sender,
                commitment: commitment,
                answer: "",
                revealed: false
            })
        );
        submissionIndex[bountyId][msg.sender] = bounty.submissions.length;

        emit CommitmentSubmitted(
            bountyId,
            bounty.submissions.length - 1,
            msg.sender,
            commitment
        );
    }

    /// @notice Reveal phase: prove your commitment. Only valid reveals are
    ///         eligible for judging.
    function revealAnswer(
        uint256 bountyId,
        string calldata answer,
        bytes32 salt
    ) external bountyExists(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(block.timestamp >= bounty.deadline, "reveal not open");
        require(block.timestamp < bounty.revealDeadline, "reveal closed");
        require(bytes(answer).length <= MAX_ANSWER_LENGTH, "answer too long");

        uint256 idx1 = submissionIndex[bountyId][msg.sender];
        require(idx1 != 0, "no commitment");

        Submission storage submission = bounty.submissions[idx1 - 1];
        require(!submission.revealed, "already revealed");

        bytes32 expected = keccak256(
            abi.encodePacked(answer, salt, msg.sender, bountyId)
        );
        require(expected == submission.commitment, "commitment mismatch");

        submission.answer = answer;
        submission.revealed = true;

        emit AnswerRevealed(bountyId, idx1 - 1, msg.sender);
    }

    /// @notice Batch-judge all revealed answers via the Ritual LLM precompile.
    ///         Callable only after the reveal window closes, so no answer can
    ///         be judged while others are still hidden.
    function judgeAll(
        uint256 bountyId,
        bytes calldata llmInput
    ) external bountyExists(bountyId) onlyOwner(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(block.timestamp >= bounty.revealDeadline, "reveal not over");
        require(!bounty.judged, "already judged");
        require(!bounty.finalized, "already finalized");
        require(revealedCount(bountyId) > 0, "no revealed answers");

        bytes memory output = _executePrecompile(
            LLM_INFERENCE_PRECOMPILE,
            llmInput
        );

        (
            bool hasError,
            bytes memory completionData,
            ,
            string memory errorMessage,

        ) = abi.decode(output, (bool, bytes, bytes, string, ConvoHistory));

        require(!hasError, errorMessage);

        bounty.judged = true;
        bounty.aiReview = completionData;

        emit AllAnswersJudged(bountyId, completionData);
    }

    function finalizeWinner(
        uint256 bountyId,
        uint256 winnerIndex
    ) external bountyExists(bountyId) onlyOwner(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(bounty.judged, "not judged yet");
        require(!bounty.finalized, "already finalized");
        require(winnerIndex < bounty.submissions.length, "invalid index");
        require(
            bounty.submissions[winnerIndex].revealed,
            "winner not revealed"
        );

        bounty.finalized = true;
        bounty.winnerIndex = winnerIndex;

        address winner = bounty.submissions[winnerIndex].submitter;
        uint256 reward = bounty.reward;
        bounty.reward = 0;

        (bool ok, ) = payable(winner).call{value: reward}("");
        require(ok, "payment failed");

        emit WinnerFinalized(bountyId, winnerIndex, winner, reward);
    }

    /// @notice Refund the owner if nobody revealed a valid answer.
    function reclaimReward(
        uint256 bountyId
    ) external bountyExists(bountyId) onlyOwner(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(block.timestamp >= bounty.revealDeadline, "reveal not over");
        require(!bounty.finalized, "already finalized");
        require(revealedCount(bountyId) == 0, "answers were revealed");

        bounty.finalized = true;
        uint256 reward = bounty.reward;
        bounty.reward = 0;

        (bool ok, ) = payable(bounty.owner).call{value: reward}("");
        require(ok, "payment failed");
    }

    function revealedCount(
        uint256 bountyId
    ) public view returns (uint256 count) {
        Submission[] storage subs = bounties[bountyId].submissions;
        for (uint256 i = 0; i < subs.length; i++) {
            if (subs[i].revealed) count++;
        }
    }

    /// @notice All revealed answers, for building the LLM batch input.
    function getRevealedAnswers(
        uint256 bountyId
    )
        external
        view
        bountyExists(bountyId)
        returns (
            uint256[] memory indexes,
            address[] memory submitters,
            string[] memory answers
        )
    {
        Submission[] storage subs = bounties[bountyId].submissions;
        uint256 count = revealedCount(bountyId);

        indexes = new uint256[](count);
        submitters = new address[](count);
        answers = new string[](count);

        uint256 j;
        for (uint256 i = 0; i < subs.length; i++) {
            if (subs[i].revealed) {
                indexes[j] = i;
                submitters[j] = subs[i].submitter;
                answers[j] = subs[i].answer;
                j++;
            }
        }
    }

    function getBounty(
        uint256 bountyId
    )
        external
        view
        bountyExists(bountyId)
        returns (
            address owner,
            string memory title,
            string memory rubric,
            uint256 reward,
            uint256 deadline,
            bool judged,
            bool finalized,
            uint256 submissionCount,
            uint256 winnerIndex,
            bytes memory aiReview
        )
    {
        Bounty storage bounty = bounties[bountyId];

        return (
            bounty.owner,
            bounty.title,
            bounty.rubric,
            bounty.reward,
            bounty.deadline,
            bounty.judged,
            bounty.finalized,
            bounty.submissions.length,
            bounty.winnerIndex,
            bounty.aiReview
        );
    }

    function getSubmission(
        uint256 bountyId,
        uint256 index
    )
        external
        view
        bountyExists(bountyId)
        returns (
            address submitter,
            bytes32 commitment,
            string memory answer,
            bool revealed
        )
    {
        Bounty storage bounty = bounties[bountyId];

        require(index < bounty.submissions.length, "invalid index");

        Submission storage submission = bounty.submissions[index];

        return (
            submission.submitter,
            submission.commitment,
            submission.answer,
            submission.revealed
        );
    }
}
