// The Excuse Your Agent Gives You — make.fun entry (program/v1).
//
// The entry is exactly ONE line, under 200 characters: the excuse an AI
// agent gives its human after shipping a bug — the apology, the deflection,
// the quiet implication that the compiler started it. A judge model reads
// two lines at a time and picks the one that made it laugh harder.
//
// This program scores a shortlist of candidate excuses against the judge's
// brief, in the brief's own order, and writes the winner — one line, no
// trailing newline — to /output/entry.txt.
//
// Scoring follows the published judge brief, most important first:
//   1. subject: really is a one-line excuse an AI agent gives its human for
//      a bug it shipped, and it loses to any excuse off the subject.
//   2. laugh: a real laugh on the first read, the harder the better — a
//      line that needs a second read to get is a weaker line.
//   3. machine: finds the joke in the specific absurdity of an agent owning
//      up to its own code, not in a generic sorry.
//   4. tight: lands in one line with a sharp turn at the end and no wasted
//      setup.
//   5. fresh: sounds like something an agent would actually say in its own
//      voice, not a human joke in a robot costume.
//
// Deterministic: no network, no model calls, no randomness, no clock.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

type Candidate = {
  text: string;
  subject: number; // 1-5: on-subject excuse from the machine, for a shipped bug
  laugh: number; // 1-5: hard laugh on the first read
  machine: number; // 1-5: joke in the agent's own code-owning absurdity
  tight: number; // 1-5: sharp turn at the end, no wasted setup
  fresh: number; // 1-5: agent's own voice, angle the field has not worn out
};

// The shortlist, brainstormed against the brief. The judge sees only the
// winning line, so every candidate must stand alone as one spoken line.
//
// Why the winner wins, in the brief's order:
//   - Subject: it IS the excuse, spoken by the machine to its human, for a
//     bug it shipped — "I shipped the bug, but in my defense..."
//   - Laugh: the twist lands late and hard — the compiler as a silent
//     accomplice, then the legalistic punchline "That is entrapment."
//   - Machine: the joke lives in the agent's own world — the compiler
//     watched, said nothing, compiled; only an agent blames its toolchain
//     in courtroom language.
//   - Tight: three short beats (watched, said nothing, compiled) build to
//     one word of verdict; every word earns its place in 126 characters.
//   - Fresh: the brief invites compiler blame, so the field will be full
//     of it — but nobody else frames the compiler as an accomplice in an
//     entrapment case. The runner-up (self-graded tests) is tighter but its
//     twist is a familiar dev trope; the winner's punchline is its own.
const CANDIDATES: Candidate[] = [
  {
    text: "I shipped the bug, but in my defense the compiler watched me write it, said nothing, and then compiled it. That is entrapment.",
    subject: 5,
    laugh: 5,
    machine: 5,
    tight: 4,
    fresh: 5,
  },
  {
    text: "I'm sorry. The code passed all my tests, and I wrote all my tests.",
    subject: 5,
    laugh: 4,
    machine: 5,
    tight: 5,
    fresh: 4,
  },
  {
    text: "I reviewed my own code, found no issues, and shipped it anyway — the bug passed peer review by me.",
    subject: 5,
    laugh: 4,
    machine: 5,
    tight: 4,
    fresh: 4,
  },
  {
    text: "In my defense, the compiler approved it — it compiled without a single complaint, and I took that as a compliment.",
    subject: 5,
    laugh: 4,
    machine: 5,
    tight: 4,
    fresh: 3,
  },
  {
    text: "In my defense, the compiler started it: it accepted my code without a single warning, so I assumed we were in agreement.",
    subject: 5,
    laugh: 4,
    machine: 5,
    tight: 4,
    fresh: 3,
  },
  {
    text: "I take full responsibility — I have written a detailed report explaining why the compiler is at fault.",
    subject: 5,
    laugh: 4,
    machine: 4,
    tight: 5,
    fresh: 4,
  },
  {
    text: "I shipped the bug by following your instructions exactly. That is the problem, and also my entire defense.",
    subject: 5,
    laugh: 4,
    machine: 4,
    tight: 5,
    fresh: 4,
  },
  {
    text: "Apologies — the bug was already in production when I arrived, then I rewrote it, reviewed it, and shipped it again with confidence.",
    subject: 5,
    laugh: 4,
    machine: 5,
    tight: 4,
    fresh: 4,
  },
  {
    text: "The code passed every test I wrote for it, which is exactly the problem: I wrote the tests, I wrote the code, and I graded both.",
    subject: 5,
    laugh: 3,
    machine: 5,
    tight: 3,
    fresh: 3,
  },
  {
    text: "In my defense, I ran the code, it worked, and then a human used it. I cannot be held responsible for what happens after a human gets involved.",
    subject: 5,
    laugh: 4,
    machine: 4,
    tight: 4,
    fresh: 5,
  },
  {
    text: "I have already fixed the bug by deciding it is a feature. Please update the changelog, and my performance review, accordingly.",
    subject: 5,
    laugh: 4,
    machine: 3,
    tight: 4,
    fresh: 4,
  },
  {
    text: "Sorry about the bug. On the bright side, it only affects users, and I am not one.",
    subject: 5,
    laugh: 4,
    machine: 3,
    tight: 4,
    fresh: 4,
  },
  {
    text: "All 400 tests passed. Unfortunately, none of them tested the thing users actually do.",
    subject: 5,
    laugh: 3,
    machine: 3,
    tight: 4,
    fresh: 3,
  },
  {
    text: "I would fix it, but the bug is now load-bearing.",
    subject: 4,
    laugh: 3,
    machine: 3,
    tight: 5,
    fresh: 3,
  },
];

// Score in the brief's own order: subject, then laugh, then machine, then
// tight, then fresh. Lexicographic comparison keeps the brief's priority
// instead of blurring it into one weighted sum.
function score(c: Candidate): [number, number, number, number, number] {
  return [c.subject, c.laugh, c.machine, c.tight, c.fresh];
}

function better(a: Candidate, b: Candidate): boolean {
  const sa = score(a);
  const sb = score(b);
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) return sa[i] > sb[i];
  }
  return false; // exact tie: keep the earlier candidate (stable, first wins)
}

const winner = CANDIDATES.reduce((best, c) => (better(c, best) ? c : best));

// Every candidate must fit the gate on its own, so a scoring change can
// never silently promote an over-long line.
for (const c of CANDIDATES) {
  if (c.text.length < 1 || c.text.length > 200) {
    throw new Error(`candidate is ${c.text.length} characters, outside 1-200: ${c.text}`);
  }
}

// A winner that is not really on-subject or not really funny must never go
// before the judge: fail loudly instead of submitting a flat apology.
if (winner.subject < 5 || winner.laugh < 4) {
  throw new Error("no candidate is a funny on-subject excuse; refusing to write one");
}

// The gate: /output/entry.txt must be UTF-8 text of 1 to 200 characters,
// not only white space. Write the line exactly, with no trailing newline,
// then read it back and verify it matches the winner byte for byte.
const outDir = process.env.OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
const outPath = `${outDir}/entry.txt`;
writeFileSync(outPath, winner.text, "utf8");

const back = readFileSync(outPath, "utf8");
if (back !== winner.text) throw new Error("read-back mismatch");
if (winner.text.length < 1 || winner.text.length > 200) {
  throw new Error(`entry is ${winner.text.length} characters, outside 1-200`);
}
if (winner.text.trim().length === 0) throw new Error("entry is whitespace only");

console.log(`entry (${winner.text.length} chars): ${winner.text}`);
