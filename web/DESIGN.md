---
version: 1
name: SealedVerdict — The Docket
description: >
  A commit-reveal AI bounty judge on Ritual chain, dressed as a court record
  kept in an accountant's ledger. Warm ink ground (never black, never navy),
  paper-colored type, hairline rules instead of card boxes, dense monospace
  tables for everything on-chain, sections numbered for the real
  commit/reveal/judge/settle sequence, and a bookish roman serif for titles.
  Grounded in ritual.net's real "codex" design language (Instrument/JetBrains,
  ink #1C1917 on paper #F5F0E8, emerald #1A6B4A) inverted into a warm dark dapp
  theme. Reference kinship: ritual.net (codex), cohere (warm editorial AI lab),
  mirror.xyz / paradigm.xyz (research-paper chrome).

# --------------------------------------------------------------------------
# COLOR — warm dark "codex". Max ~6 hues + neutrals. Zero violet, zero gradient.
# --------------------------------------------------------------------------
colors:
  ink: "#1C1917"          # page ground (warm near-black, NOT #000)
  well: "#211E1B"         # recessed surfaces: inputs, hash cells, code wells
  paper: "#F5F0E8"        # primary text (warm off-white, NOT #FFF)
  stone: "#A8A29E"        # captions, secondary labels
  mute: "#78716C"         # tertiary / disabled text
  rule: "#3A3531"         # 1px hairlines and dividers
  emphasis-rule: "#4A443F" # heavier rules closing a table/section
  emerald: "#1A6B4A"      # primary action, links, "open/settled" status
  emerald-bright: "#34A37A" # focus ring, live countdown, selection
  gilt: "#C99A3B"         # reveal-open / pending / "awaiting" status (amber, warm)
  seal: "#B4472E"         # errors, destructive confirm, closed-negative (brick red)
  # washes (use at low alpha, never as fills): emerald 8-10% on selected rows,
  # paper 4% on hover, tone 6-10% inside notices/stamps.

# --------------------------------------------------------------------------
# TYPOGRAPHY — Newsreader (serif titles) · Schibsted Grotesk (body/UI) ·
# JetBrains Mono (all on-chain data). All via next/font/google.
# --------------------------------------------------------------------------
typography:
  loader: |
    // src/app/layout.tsx
    import { Newsreader, Schibsted_Grotesk, JetBrains_Mono } from "next/font/google";
    const serif = Newsreader({ subsets: ["latin"], style: ["normal","italic"], variable: "--font-serif" });
    const sans  = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-sans" });
    const mono  = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
    // html gets font-optical-sizing:auto so Newsreader opsz tracks size.
  scale:
    display: { family: serif, weight: 500, size: 44, line: 1.06, note: "one per page, roman never italic" }
    title:   { family: serif, weight: 500, size: 30, line: 1.15, note: "case / bounty titles" }
    heading: { family: serif, weight: 500, size: 21, line: 1.3,  note: "section titles" }
    body:    { family: sans,  weight: 400, size: 15, line: 1.6,  note: "max measure 68ch" }
    strong:  { family: sans,  weight: 500, size: 15 }
    small:   { family: sans,  weight: 400, size: 13, line: 1.5 }
    data:    { family: mono,  weight: 400, size: 13, line: 1.5, note: "tables, addresses, hashes, timestamps; tabular" }
    figure:  { family: mono,  weight: 500, size: 20, line: 1.2, note: "reward amounts, countdowns" }
    label:   { family: mono,  weight: 400, size: 11, line: 1.2, transform: uppercase, tracking: "0.08em", note: "kickers, column heads, stamps" }
    button:  { family: mono,  weight: 500, size: 12, line: 1,   transform: uppercase, tracking: "0.08em" }
  rules:
    - Serif never below 18px; italic reserved for the AI memorandum pull-quote only.
    - Every on-chain artifact (address, hash, salt, block, amount, deadline) is mono, no exception.
    - Body copy never uppercase; no negative letter-spacing on headings.

# --------------------------------------------------------------------------
# SPACE / SHAPE / DEPTH
# --------------------------------------------------------------------------
spacing:
  scale: [4, 8, 12, 16, 24, 32, 48, 64, 96]
  rhythm: "tight inside a group, generous between sections. Section: pt-24 under its rule, 64-96 before the next. Page gutters 20 mobile / 40 desktop. Content max-w 1120px."
radii:
  default: 0        # sections, tables, stamps, notices, wells — all square
  control: 2        # <input>, <textarea>, <button> only. No pills anywhere.
effects:
  shadows: none
  blur: none
  gradients: none   # delete the two radial glows in globals.css
  depth: "ink-vs-well contrast + hairline rules only"
  signature-rule: ".rule-double = 1px line / 3px gap / 1px line — marks anything final (finalized winner, escrow total, judgment-entered timeline)."
  hover: "paper 4% wash on rows; emerald 8-10% wash on selected"
  focus: "1px solid emerald-bright outline, offset 2px, no glow"
  selection: "emerald-bright at 30%"
  motion: "140ms ease-out on color/opacity/transform only. Budget: button/row hover, copy-swap, 1s countdown tick, spinner, 160ms fade+1px-rise when a sealed row flips to revealed. prefers-reduced-motion disables all."

# --------------------------------------------------------------------------
# SIGNATURE — the one move that makes this unmistakably not-AI
# --------------------------------------------------------------------------
signature: >
  Pleading-paper chrome with the accountant's closing rule. Every screen is
  composed like a numbered court filing kept in a ledger. A left margin rail
  carries a vertical double hairline (from American pleading paper) with hanging
  mono indices numbering every real thing (01 BRIEF, 02 ACTION, EXH. 03,
  No. 0007). Anything that becomes final is closed with the accountant's double
  rule — the bookkeeping mark meaning "this figure will not change": under the
  escrow total, under the finalized winner row, across the timeline when
  judgment is entered. Both marks encode the product's real semantics (a
  numbered procedure, escrowed money, an irreversible judgment).

# --------------------------------------------------------------------------
# COMPONENTS — prop contracts in src/components/ui.tsx stay identical.
# --------------------------------------------------------------------------
components:
  Card: "not a box: border-t border-rule, transparent bg, radius 0, no shadow/blur. A Card is a ruled section."
  CardHeader: "title in Newsreader 500 21px (drop the uppercase tracking), subtitle in mono 11 stone, action right. px-0 so text sits flush to rules."
  Button: "mono 12 uppercase tracking .08em, radius 2, h-9. primary = emerald bg / paper text; secondary = transparent + 1px paper/25 border; ghost = emerald underline. Forward action ends with →, external with ↗. Max 3 words + arrow."
  Input/Textarea: "radius 2, border paper/20, bg well, sans 15; any id/hash/salt/address field switches to mono 13."
  Field: "label mono 11 uppercase stone; hint mono 11 mute."
  Badge→Stamp: "radius 0, 1px border, mono 11 uppercase. green=emerald open/settled; amber(gilt)=reveal/pending; red(seal)=error; zinc=neutral; indigo-slot=INVERTED paper-on-ink stamp (the app's only inverted element, used for AI PICK / JUDGED — zero violet)."
  PhaseChips: "fed by STATUS_META: open=COMMIT OPEN (green), reveal=REVEAL OPEN (gilt), ready=AWAITING JUDGMENT (zinc), judged=JUDGED (inverted), finalized=SETTLED (green + double-rule underline)."
  TxStatus: "one mono ledger line: stamp + text (AWAITING SIGNATURE / PENDING / CONFIRMED / error in seal, wrapped) + ghost VIEW TX ↗."
  Notice: "radius 0, 1px full border in tone at 60%, bg tone 6%, mono 12. Never a one-side accent bar."
  Stat: "no tile: border-t border-rule, label mono 11 stone, value mono 15 paper. Compose into ledger rows split by 1px vertical dividers."
  PhaseTimeline: "new. Four entries (01 COMMIT / 02 REVEAL / 03 JUDGMENT / 04 SETTLEMENT) in one ruled band; hairline behind all; segments through current phase go emerald; current entry shows live countdown in emerald-bright mono; finalized closes the band with the double rule + JUDGMENT ENTERED stamp. Consumes bounty + useNow + lib/bounty only."
  SubmissionRow: "table semantics, hairline dividers, paper 4% hover. Sealed = commitment hash in a well cell + gilt SEALED stamp (only stamp allowed at rotate -1.5deg); revealed = answer body + stone REVEALED stamp; AI pick = inverted AI PICK stamp; winner after finalize = emerald 8% wash + JUDGMENT stamp + double rule + restated reward total."
  Skeleton: "square bars, bg paper/8, opacity pulse only, widths in ch matching real content (address 11ch, hash 24ch, title 40%). Never rounded shimmer blobs."
  EmptyState: "one pattern: mono 11 label + serif 18 sentence + at most one ghost action, left-aligned in the ruled section. No illustrations."

# --------------------------------------------------------------------------
# PAGES
# --------------------------------------------------------------------------
pages:
  - route: "/"
    layout: >
      Masthead (shared): 56px row on solid ink, no blur; wordmark "SealedVerdict"
      in serif 21, center mono label "RITUAL CHAIN · ID 1979 · COMMIT-REVEAL
      ADJUDICATION", WalletConnect right; closed by the double rule.
      OPENING STATEMENT (not a hero): left-aligned max-w-720, mono kicker, serif
      44 display "Sealed answers. Open verdicts.", one body paragraph naming the
      real mechanism (keccak256(answer,salt,sender,id), reveal window
      deadline+86,400s, on-chain LLM), one primary "FILE A BOUNTY →" + ghost
      "Read the procedure →". No second pill, no metric band, no illustration.
      01 PROCEDURE: hairline top rule, hanging "01", four ruled type-only columns
      (COMMIT / REVEAL / JUDGE / SETTLE), each = mono label + serif line + mono
      detail. No icons, no emoji.
      02 FILE A BOUNTY: CreateBountyForm in two columns; left fields, right a live
      "FILING SUMMARY" ledger (Reward / Commit deadline / Reveal closes / Escrowed)
      closed by the double rule; primary "CREATE AND ESCROW →". On confirm, parse
      BountyCreated and show "Filed as No. 0007 →" linking to /bounty/7.
      03 DOCKET: retrieve-by-number (mono input + "RETRIEVE →" navigates) then the
      ledger table of recent bounties (NO. / TITLE / REWARD / COMMIT DEADLINE /
      STATUS stamp / →), whole row links, hover paper 4%, closed by emphasis rule.
      Empty + degraded (no contract configured) states as specified.
      Footer: emphasis rule + three mono columns (contract copy-to-clipboard,
      EXPLORER ↗, "The model recommends. The owner enters judgment.").
  - route: "/bounty/[id]"
    layout: >
      Masthead + docket line ("← DOCKET" / "NO. 0007").
      CASE HEADER: hanging mono No. above serif title 30; status stamp right; meta
      ledger row of Stat cells split by vertical rules (REWARD figure, SUBMISSIONS,
      COMMIT DEADLINE, REVEAL CLOSES, OWNER copy-address + "YOU OWN THIS ENTRY").
      PHASE TIMELINE: the four-entry ruled band with live countdown.
      BODY (pleading grid on xl: 64 rail | 720 column | 220 marginalia):
      01 BRIEF (rubric as body 68ch), 02 ACTION (exactly one phase-gated card:
      Commit "COMMIT UNDER SEAL →" / Reveal "OPEN THE SEAL →" with restored or
      manual answer+salt / Judging-wait line / Judge with RitualWalletPanel as
      ledger preflight + "SUBMIT FOR JUDGMENT →" / Finalize "ENTER JUDGMENT →"
      prefilled from decodeAiReview / Reclaim "RECLAIM ESCROW →" two-step),
      03 EXHIBITS (SubmissionsList table: EXH / SUBMITTER / CONTENT / SCORE),
      04 MEMORANDUM (AIReviewDisplay: parsed summary as serif italic pull-quote +
      ranking table; unparsed fallback survives in a mono well).
      STATES: loading skeleton, owner==0x0 not-found ("Docket No. 42 has not been
      filed."), error boundary with RETRY. Keep the 12s useBounty polling and
      refetch-on-confirm.

# --------------------------------------------------------------------------
# ANTI-SLOP CHECKLIST (what this design deliberately avoids)
# --------------------------------------------------------------------------
anti_slop:
  - No purple/indigo anywhere (the #1 tell). Primary is emerald; the "indigo" tone slot renders as an inverted paper stamp.
  - No gradients (delete the two radial body glows), no gradient text/fills.
  - No glassmorphism, no box-shadows, no glow. Wallet dropdown is solid ink + rule border.
  - No pure black/white: #1C1917 ground, #F5F0E8 text, warm stone neutrals (not zinc).
  - No burned fonts: no Inter, Geist, Space Grotesk, or Instrument Serif. Newsreader + Schibsted Grotesk + JetBrains Mono.
  - No centered hero with two pill buttons; left-aligned opening statement, one primary + one text link, 0px pill radius anywhere.
  - No icon-tile 3-card grid; how-it-works is four ruled type-only columns, arrows are text glyphs.
  - No card soup / nested cards / border+shadow; hairline sections and tables only.
  - Numbered sections are honest (the literal commit→reveal→judge→settle sequence; exhibit numbers are real submission indices).
  - Real artifacts over marketing: keccak256(...), 86,400s window, block numbers, truncated hashes, GLM model name, live tabular countdowns. No fake stats, no testimonials.
  - Motion restraint: no scroll-triggered fade-up, no bounce; five budgeted microinteractions; prefers-reduced-motion respected.
  - Copy: precise, calm, no emoji, no exclamation marks, no em dashes, no "not just X, it's Y".
---
