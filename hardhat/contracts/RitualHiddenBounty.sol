// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Advanced Track: Ritual-native hidden submissions.
///
///      Participants submit answers ENCRYPTED to the TEE's public key. Plaintext
///      never exists on-chain, not even after judging: only inside the Ritual
///      TEE during the batch LLM call. The TEE posts the winner index signed by
///      its attested key; the contract verifies that signature before accepting.
///
///      Trust model: the TEE signer address is pinned at bounty creation. On real
///      Ritual infra this address is derived from a remote-attestation quote of
///      the enclave; here the contract only checks the ECDSA signature, and the
///      attestation-to-address binding happens at registration time.
contract RitualHiddenBounty {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum Phase { Open, Judging, Finalized }

    struct Bounty {
        address owner;
        address teeSigner;          // enclave key, pinned at creation
        bytes   teePubkey;          // encryption pubkey participants encrypt to
        uint256 submissionDeadline;
        Phase   phase;
        uint256 winnerIndex;
        bool    winnerSet;
    }

    struct EncryptedSubmission {
        address submitter;
        bytes32 ciphertextHash;     // keccak256 of the ciphertext blob
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    uint256 public nextBountyId;
    mapping(uint256 => Bounty) public bounties;
    mapping(uint256 => EncryptedSubmission[]) public submissions;
    mapping(uint256 => mapping(address => bool)) public hasSubmitted;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @dev Ciphertext travels in the event (calldata), only its hash is stored.
    ///      The Ritual node reconstructs the batch from these events.
    event EncryptedAnswerSubmitted(
        uint256 indexed bountyId,
        uint256 indexed submissionIndex,
        address indexed submitter,
        bytes ciphertext
    );
    event BountyCreated(uint256 indexed bountyId, address indexed owner, address teeSigner, uint256 submissionDeadline);
    event BatchJudgingRequested(uint256 indexed bountyId, uint256 submissionCount, bytes32 batchDigest);
    event WinnerAttested(uint256 indexed bountyId, uint256 winnerIndex, address winner);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotBountyOwner();
    error SubmissionPhaseClosed();
    error SubmissionPhaseNotClosed();
    error AlreadySubmitted();
    error EmptyCiphertext();
    error NotJudging();
    error AlreadyFinalized();
    error InvalidWinnerIndex();
    error InvalidAttestation();

    // -------------------------------------------------------------------------
    // Bounty management
    // -------------------------------------------------------------------------

    function createBounty(
        address teeSigner,
        bytes calldata teePubkey,
        uint256 submissionDeadline
    ) external returns (uint256 bountyId) {
        require(teeSigner != address(0), "tee signer required");
        require(submissionDeadline > block.timestamp, "deadline must be future");

        bountyId = nextBountyId++;
        Bounty storage b = bounties[bountyId];
        b.owner = msg.sender;
        b.teeSigner = teeSigner;
        b.teePubkey = teePubkey;
        b.submissionDeadline = submissionDeadline;
        b.phase = Phase.Open;

        emit BountyCreated(bountyId, msg.sender, teeSigner, submissionDeadline);
    }

    function teePubkeyOf(uint256 bountyId) external view returns (bytes memory) {
        return bounties[bountyId].teePubkey;
    }

    // -------------------------------------------------------------------------
    // Submission (encrypted, no reveal phase needed)
    // -------------------------------------------------------------------------

    /// @notice Submit an answer encrypted to the bounty's TEE pubkey.
    ///         The ciphertext is emitted (available to the Ritual node) and only
    ///         its hash is stored, keeping storage cost flat.
    function submitEncrypted(uint256 bountyId, bytes calldata ciphertext) external {
        Bounty storage b = bounties[bountyId];
        if (block.timestamp > b.submissionDeadline) revert SubmissionPhaseClosed();
        if (hasSubmitted[bountyId][msg.sender])     revert AlreadySubmitted();
        if (ciphertext.length == 0)                 revert EmptyCiphertext();

        hasSubmitted[bountyId][msg.sender] = true;
        submissions[bountyId].push(EncryptedSubmission({
            submitter: msg.sender,
            ciphertextHash: keccak256(ciphertext)
        }));

        emit EncryptedAnswerSubmitted(bountyId, submissions[bountyId].length - 1, msg.sender, ciphertext);
    }

    // -------------------------------------------------------------------------
    // Judging
    // -------------------------------------------------------------------------

    /// @notice Owner kicks off batch judging after the deadline. Emits the batch
    ///         digest the TEE must sign over, binding the judgment to this exact
    ///         set of ciphertexts.
    function requestBatchJudging(uint256 bountyId) external {
        Bounty storage b = bounties[bountyId];
        if (msg.sender != b.owner)                    revert NotBountyOwner();
        if (block.timestamp <= b.submissionDeadline)  revert SubmissionPhaseNotClosed();
        if (b.phase != Phase.Open)                    revert AlreadyFinalized();

        b.phase = Phase.Judging;
        emit BatchJudgingRequested(bountyId, submissions[bountyId].length, batchDigest(bountyId));
    }

    /// @notice The digest the TEE signs: binds bountyId, this contract, the chain,
    ///         the winner-to-be is appended by the TEE (see submitAttestedWinner).
    function batchDigest(uint256 bountyId) public view returns (bytes32) {
        EncryptedSubmission[] storage subs = submissions[bountyId];
        bytes32 acc;
        for (uint256 i; i < subs.length; i++) {
            acc = keccak256(abi.encodePacked(acc, subs[i].submitter, subs[i].ciphertextHash));
        }
        return keccak256(abi.encodePacked(block.chainid, address(this), bountyId, acc));
    }

    /// @notice The Ritual node (anyone can relay) posts the TEE's judgment.
    ///         signature = ECDSA over keccak256(batchDigest, winnerIndex) by teeSigner.
    function submitAttestedWinner(
        uint256 bountyId,
        uint256 winnerIndex,
        bytes calldata signature
    ) external {
        Bounty storage b = bounties[bountyId];
        if (b.phase != Phase.Judging) revert NotJudging();
        if (b.winnerSet)              revert AlreadyFinalized();

        EncryptedSubmission[] storage subs = submissions[bountyId];
        if (winnerIndex >= subs.length) revert InvalidWinnerIndex();

        bytes32 message = keccak256(abi.encodePacked(batchDigest(bountyId), winnerIndex));
        if (_recover(message, signature) != b.teeSigner) revert InvalidAttestation();

        b.winnerIndex = winnerIndex;
        b.winnerSet = true;
        b.phase = Phase.Finalized;

        emit WinnerAttested(bountyId, winnerIndex, subs[winnerIndex].submitter);
    }

    // -------------------------------------------------------------------------
    // Views / internals
    // -------------------------------------------------------------------------

    function getSubmissionCount(uint256 bountyId) external view returns (uint256) {
        return submissions[bountyId].length;
    }

    function _recover(bytes32 message, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) return address(0);
        bytes32 r = bytes32(signature[0:32]);
        bytes32 s = bytes32(signature[32:64]);
        uint8 v = uint8(signature[64]);
        // EIP-191 personal-sign prefix so the TEE can use a standard signer
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));
        return ecrecover(ethHash, v, r, s);
    }
}
