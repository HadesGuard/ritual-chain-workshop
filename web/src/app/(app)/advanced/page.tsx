import Link from "next/link";
import { AttestationDemo } from "@/components/AttestationDemo";

const CONTRACT_URL =
  "https://github.com/HadesGuard/ritual-chain-workshop/blob/main/hardhat/contracts/RitualHiddenBounty.sol";

const HIDDEN_ADDRESS = "0x5DCEBc52D5014F1d11352A8639178457C9e7d397";
const SCAN_URL = `https://explorer.ritualfoundation.org/address/${HIDDEN_ADDRESS}`;

const steps = [
  {
    n: "01",
    title: "Post with a pinned enclave",
    body: "The owner fixes the enclave signer address and the public key entrants encrypt to. Both are locked into the bounty at creation.",
    fn: "createBounty(teeSigner, teePubkey, deadline)",
  },
  {
    n: "02",
    title: "Submit encrypted",
    body: "An entrant encrypts their answer to the enclave key. The contract keeps only the ciphertext hash and emits the blob, so the Ritual node can rebuild the batch. Nothing readable is stored.",
    fn: "submitEncrypted(bountyId, ciphertext)",
  },
  {
    n: "03",
    title: "Lock the set for judging",
    body: "After the deadline the owner freezes the submissions. The contract emits a batch digest that binds this exact set of ciphertexts, so the judgment cannot be applied to a different batch.",
    fn: "requestBatchJudging(bountyId)",
  },
  {
    n: "04",
    title: "Attested winner comes back",
    body: "The enclave decrypts and scores every answer in one LLM call, then signs the winner index over the digest. Anyone can relay it; the contract accepts only a signature from the pinned key.",
    fn: "submitAttestedWinner(bountyId, winnerIndex, signature)",
  },
];

export default function AdvancedPage() {
  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-[120px] pt-14">
      <div className="max-w-[730px]">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-soft">
          Advanced track · Ritual-native
        </span>
        <h1 className="mt-4 text-[40px] font-bold leading-[1.05] tracking-[-0.02em]">
          The answers stay encrypted, even on-chain.
        </h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-text2">
          Commit-Reveal hides answers until a reveal step, then they go public. The Ritual TEE track
          never publishes them at all. Entrants encrypt to the enclave key, the model reads and
          scores everything inside the TEE, and the only thing that comes back out is a signed
          winner index.
        </p>
        <a
          href={SCAN_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-green/40 bg-green-tint px-3.5 py-1.5 font-mono text-[11px] text-green-bright transition hover:border-green"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green shadow-[0_0_8px_rgba(53,208,127,0.8)]" />
          Deployed on Ritual · {HIDDEN_ADDRESS.slice(0, 6)}…{HIDDEN_ADDRESS.slice(-4)} →
        </a>
      </div>

      {/* Compare */}
      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[16px] border border-line bg-surface p-6 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[16px] font-semibold">Commit-Reveal</span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              any EVM
            </span>
          </div>
          <p className="text-[13.5px] leading-[1.6] text-text2">
            Answers are hashed now and revealed after the deadline, and the contract checks the hash
            matches. Simple and portable, but the plaintext becomes public at reveal. This is what
            SealedVerdict runs today.
          </p>
        </div>
        <div className="rounded-[16px] border border-indigo/40 bg-indigo-tint p-6 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[16px] font-semibold">Ritual TEE</span>
            <span className="rounded-full bg-indigo/30 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-indigo-soft">
              private
            </span>
          </div>
          <p className="text-[13.5px] leading-[1.6] text-text2">
            Answers are encrypted to the enclave and never revealed in public. The TEE decrypts,
            judges the whole batch at once, and signs the winner. Plaintext never touches the chain,
            not even after judging.
          </p>
        </div>
      </div>

      {/* Flow */}
      <h2 className="mt-14 mb-6 text-[22px] font-bold tracking-[-0.01em]">The flow</h2>
      <div className="flex flex-col gap-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className="flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-5 backdrop-blur-md sm:flex-row sm:items-center sm:gap-5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.05] font-mono text-[14px] font-semibold text-indigo-soft">
              {s.n}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{s.title}</div>
              <p className="mt-1 text-[13px] leading-[1.55] text-text2">{s.body}</p>
            </div>
            <code className="shrink-0 rounded-[10px] bg-bg/60 px-3 py-2 font-mono text-[11px] text-green">
              {s.fn}
            </code>
          </div>
        ))}
      </div>

      {/* Live attestation */}
      <h2 className="mt-14 mb-2 text-[22px] font-bold tracking-[-0.01em]">See the attestation</h2>
      <p className="mb-6 max-w-[680px] text-[14px] leading-[1.6] text-text2">
        Step 04 is the trust anchor: the winner is only accepted if the enclave signed it. Here it
        runs for real in your browser, with an in-page keypair playing the enclave.
      </p>
      <AttestationDemo />

      {/* Status */}
      <h2 className="mt-14 mb-4 text-[22px] font-bold tracking-[-0.01em]">Where this stands</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[16px] border border-green/30 bg-green-tint p-6 backdrop-blur-md">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-green">
            Live on Ritual
          </div>
          <p className="text-[13.5px] leading-[1.6] text-text2">
            The contract is deployed and unit-tested (submission, judging, and the full set of
            attestation reverts). The math in the demo above is the same math it runs on-chain.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12px]">
            <a href={SCAN_URL} target="_blank" rel="noreferrer" className="text-green-bright underline">
              {HIDDEN_ADDRESS.slice(0, 10)}…{HIDDEN_ADDRESS.slice(-6)} on RitualScan
            </a>
            <a href={CONTRACT_URL} target="_blank" rel="noreferrer" className="text-indigo-soft underline">
              Read the source
            </a>
          </div>
        </div>
        <div className="rounded-[16px] border border-line bg-surface p-6 backdrop-blur-md">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-indigo-soft">
            Still simulated
          </div>
          <p className="text-[13.5px] leading-[1.6] text-text2">
            The enclave here is a demo keypair, and the encrypt, submit, and relay steps are not
            wired into this UI yet. A production flow needs the real TEE attestation quote binding
            the signer, plus the Ritual node relaying decryption and batch judgment. The signer is
            pinned at creation for exactly that reason.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/create"
          className="rounded-full bg-green px-6 py-3 text-[14px] font-semibold text-on-accent shadow-[0_0_24px_rgba(53,208,127,0.28)]"
        >
          Post a Commit-Reveal bounty
        </Link>
        <Link
          href="/"
          className="rounded-full border border-line bg-surface px-6 py-3 text-[14px] font-semibold text-ink hover:bg-white/[0.08]"
        >
          Back to bounties
        </Link>
      </div>
    </main>
  );
}
