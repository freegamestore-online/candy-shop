// ── Morning Phase Scene ───────────────────────────────────────────────────────
// Shows the daily event, then runs the 3-item sorting mini-game.

import kaplay from "kaplay";
import {
  GameState, DailyEvent, EVENT_LABELS, EVENT_DESC,
  GUMMY_TIERS, CHOCO_TIERS, HARD_TIERS,
  CandyCategory, STAGES,
} from "./state";

type K = ReturnType<typeof kaplay>;

const SORT_ITEMS: { name: string; cat: CandyCategory }[] = [
  { name: "Sour Worms",       cat: "gummy" },
  { name: "Neon Bears",       cat: "gummy" },
  { name: "Galaxy Rings",     cat: "gummy" },
  { name: "Milk Buttons",     cat: "choco" },
  { name: "Fudge Cubes",      cat: "choco" },
  { name: "Gold Choc Bars",   cat: "choco" },
  { name: "Mint Drops",       cat: "hard"  },
  { name: "Lemon Discs",      cat: "hard"  },
  { name: "Crystal Rocks",    cat: "hard"  },
];

const CAT_KEYS: Record<string, CandyCategory> = { g: "gummy", c: "choco", h: "hard" };
const CAT_LABELS: Record<CandyCategory, string> = {
  gummy: "[G] Gummies",
  choco: "[C] Chocolates",
  hard:  "[H] Hard Candies",
};
const CAT_COLORS: Record<CandyCategory, [number,number,number]> = {
  gummy: [255, 100, 180],
  choco: [160, 100, 60],
  hard:  [100, 200, 255],
};

function pickEvent(): DailyEvent {
  const pool: DailyEvent[] = ["normal","normal","flash","bogo","rainy","thief_spree"];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function registerMorningScene(k: K, gs: GameState, onDone: () => void) {
  const VW = 480, VH = 640;

  k.scene("morning", () => {
    // Pick today's event
    gs.dailyEvent = pickEvent();
    const stage = STAGES[gs.stageIdx]!;

    // ── Background ────────────────────────────────────────────────────────────
    k.add([k.rect(VW, VH), k.color(30, 20, 40), k.pos(0, 0), k.fixed()]);

    // ── Header ────────────────────────────────────────────────────────────────
    k.add([
      k.text(`Day ${gs.day}  •  ${stage.name}`, { size: 14, font: "sans-serif" }),
      k.color(180, 180, 200), k.pos(VW / 2, 18), k.anchor("center"),
    ]);
    k.add([
      k.text("🌅 Good Morning!", { size: 26, font: "sans-serif" }),
      k.color(255, 220, 80), k.pos(VW / 2, 52), k.anchor("center"),
    ]);

    // ── Event card ────────────────────────────────────────────────────────────
    k.add([k.rect(380, 80, { radius: 8 }), k.color(50, 40, 70), k.pos(VW / 2, 110), k.anchor("center")]);
    k.add([
      k.text(EVENT_LABELS[gs.dailyEvent], { size: 18, font: "sans-serif" }),
      k.color(255, 240, 120), k.pos(VW / 2, 92), k.anchor("center"),
    ]);
    k.add([
      k.text(EVENT_DESC[gs.dailyEvent], { size: 12, font: "sans-serif", width: 340 }),
      k.color(200, 200, 220), k.pos(VW / 2, 118), k.anchor("center"),
    ]);

    // ── Stats bar ─────────────────────────────────────────────────────────────
    k.add([
      k.text(
        `💰 $${gs.cash.toFixed(0)}   ⭐ ${gs.reputation}% Rep   Rent: $${stage.rent}`,
        { size: 13, font: "sans-serif" }
      ),
      k.color(160, 220, 160), k.pos(VW / 2, 165), k.anchor("center"),
    ]);

    // ── Stock display ─────────────────────────────────────────────────────────
    const gName = GUMMY_TIERS[gs.gummyTier]?.name ?? "Gummies";
    const cName = CHOCO_TIERS[gs.chocoTier]?.name ?? "Chocolates";
    const hName = HARD_TIERS[gs.hardTier]?.name ?? "Hard Candy";
    k.add([
      k.text(
        `Stock: ${gName} ×${gs.stock.gummy}  ${cName} ×${gs.stock.choco}  ${hName} ×${gs.stock.hard}`,
        { size: 11, font: "sans-serif", width: 420 }
      ),
      k.color(180, 180, 200), k.pos(VW / 2, 190), k.anchor("center"),
    ]);

    // ── Mini-game section ─────────────────────────────────────────────────────
    k.add([
      k.text("📦 Stockroom Sort!", { size: 20, font: "sans-serif" }),
      k.color(100, 220, 255), k.pos(VW / 2, 225), k.anchor("center"),
    ]);
    k.add([
      k.text("Sort 3 items correctly in 3s each to earn +3 stock per category.", { size: 11, font: "sans-serif", width: 380 }),
      k.color(160, 160, 180), k.pos(VW / 2, 248), k.anchor("center"),
    ]);
    k.add([
      k.text("[G] Gummies   [C] Chocolates   [H] Hard", { size: 13, font: "sans-serif" }),
      k.color(200, 200, 220), k.pos(VW / 2, 268), k.anchor("center"),
    ]);

    // ── Mini-game state ───────────────────────────────────────────────────────
    const queue = shuffle(SORT_ITEMS).slice(0, 3);
    let idx = 0;
    let elapsed = 0;
    let phase: "sorting" | "result" = "sorting";
    let allCorrect = true;
    let done = false;

    // Item display objects (destroyed/recreated per item)
    let itemLabel = k.add([
      k.text("", { size: 22, font: "sans-serif" }),
      k.color(255, 255, 255), k.pos(VW / 2, 320), k.anchor("center"),
    ]);
    let timerBar = k.add([k.rect(300, 12, { radius: 4 }), k.color(80, 220, 80), k.pos(VW / 2, 355), k.anchor("center")]);
    let timerBg  = k.add([k.rect(300, 12, { radius: 4 }), k.color(60, 60, 80),  k.pos(VW / 2, 355), k.anchor("center")]);

    // Progress dots
    const dots: ReturnType<K["add"]>[] = [];
    for (let i = 0; i < 3; i++) {
      dots.push(k.add([
        k.circle(10),
        k.color(80, 80, 100),
        k.pos(VW / 2 - 30 + i * 30, 380),
        k.anchor("center"),
      ]));
    }

    let feedbackLabel = k.add([
      k.text("", { size: 16, font: "sans-serif" }),
      k.color(255, 200, 80), k.pos(VW / 2, 410), k.anchor("center"),
    ]);

    // Category buttons (touch)
    const BTN_Y = 470;
    const btns: { cat: CandyCategory; obj: ReturnType<K["add"]> }[] = [];
    const btnDefs: { cat: CandyCategory; x: number; label: string }[] = [
      { cat: "gummy", x: VW / 2 - 130, label: "[G]\nGummies" },
      { cat: "choco", x: VW / 2,        label: "[C]\nChocolates" },
      { cat: "hard",  x: VW / 2 + 130,  label: "[H]\nHard" },
    ];
    for (const def of btnDefs) {
      const bg = k.add([
        k.rect(100, 60, { radius: 8 }),
        k.color(...CAT_COLORS[def.cat]),
        k.pos(def.x, BTN_Y),
        k.anchor("center"),
        k.area(),
      ]);
      k.add([
        k.text(def.label, { size: 12, font: "sans-serif", align: "center" }),
        k.color(255, 255, 255),
        k.pos(def.x, BTN_Y),
        k.anchor("center"),
      ]);
      btns.push({ cat: def.cat, obj: bg });
    }

    // Skip button
    const skipBtn = k.add([
      k.rect(160, 44, { radius: 8 }),
      k.color(70, 60, 90),
      k.pos(VW / 2, 555),
      k.anchor("center"),
      k.area(),
    ]);
    k.add([
      k.text("Skip → Open Shop", { size: 13, font: "sans-serif" }),
      k.color(180, 180, 200), k.pos(VW / 2, 555), k.anchor("center"),
    ]);

    skipBtn.onClick(() => {
      if (done) return;
      done = true;
      onDone();
    });

    function renderItem() {
      const item = queue[idx];
      if (!item) return;
      itemLabel.text = `Item ${idx + 1}/3: ${item.name}`;
      elapsed = 0;
      timerBar.width = 300;
      k.color(80, 220, 80);
    }

    function handleGuess(cat: CandyCategory) {
      if (phase !== "sorting" || done) return;
      const item = queue[idx];
      if (!item) return;
      const correct = item.cat === cat;
      if (correct) {
        feedbackLabel.text = "✓ Correct!";
        feedbackLabel.color = k.rgb(80, 255, 120);
        if (dots[idx]) dots[idx]!.color = k.rgb(80, 255, 120);
      } else {
        feedbackLabel.text = "✗ Wrong!";
        feedbackLabel.color = k.rgb(255, 80, 80);
        if (dots[idx]) dots[idx]!.color = k.rgb(255, 80, 80);
        allCorrect = false;
      }
      idx++;
      if (idx >= 3) {
        phase = "result";
        showResult();
      } else {
        k.wait(0.3, renderItem);
      }
    }

    function showResult() {
      if (allCorrect) {
        gs.stock.gummy += 3;
        gs.stock.choco += 3;
        gs.stock.hard  += 3;
        itemLabel.text = "🎉 Perfect! +3 stock each!";
        itemLabel.color = k.rgb(80, 255, 120);
      } else {
        itemLabel.text = "No stock gained.";
        itemLabel.color = k.rgb(255, 120, 80);
      }
      timerBar.width = 0;
      feedbackLabel.text = "Tap 'Open Shop' to start the shift!";
      feedbackLabel.color = k.rgb(200, 200, 220);
    }

    // Touch on category buttons
    for (const btn of btns) {
      btn.obj.onClick(() => handleGuess(btn.cat));
    }

    // Keyboard
    k.onKeyPress("g", () => handleGuess("gummy"));
    k.onKeyPress("c", () => handleGuess("choco"));
    k.onKeyPress("h", () => handleGuess("hard"));
    k.onKeyPress("enter", () => { if (phase === "result" && !done) { done = true; onDone(); } });
    k.onKeyPress("space", () => { if (!done) { done = true; onDone(); } });

    // Open shop button (shown after result or always via skip)
    const openBtn = k.add([
      k.rect(180, 50, { radius: 10 }),
      k.color(60, 180, 100),
      k.pos(VW / 2, 520),
      k.anchor("center"),
      k.area(),
    ]);
    k.add([
      k.text("Open Shop →", { size: 16, font: "sans-serif" }),
      k.color(255, 255, 255), k.pos(VW / 2, 520), k.anchor("center"),
    ]);
    openBtn.onClick(() => { if (!done) { done = true; onDone(); } });

    // Update loop
    k.onUpdate(() => {
      if (phase !== "sorting" || done) return;
      elapsed += k.dt();
      const frac = Math.max(0, 1 - elapsed / 3);
      timerBar.width = 300 * frac;
      if (frac > 0.5) timerBar.color = k.rgb(80, 220, 80);
      else if (frac > 0.25) timerBar.color = k.rgb(255, 200, 60);
      else timerBar.color = k.rgb(255, 80, 80);

      if (elapsed >= 3) {
        // Time's up for this item
        feedbackLabel.text = "⏱ Too slow!";
        feedbackLabel.color = k.rgb(255, 80, 80);
        if (dots[idx]) dots[idx]!.color = k.rgb(255, 80, 80);
        allCorrect = false;
        idx++;
        if (idx >= 3) {
          phase = "result";
          showResult();
        } else {
          k.wait(0.3, renderItem);
        }
      }
    });

    // Fix draw order: bg behind bar
    k.destroy(timerBar);
    k.destroy(timerBg);
    timerBg  = k.add([k.rect(300, 12, { radius: 4 }), k.color(60, 60, 80),  k.pos(VW / 2, 355), k.anchor("center")]);
    timerBar = k.add([k.rect(300, 12, { radius: 4 }), k.color(80, 220, 80), k.pos(VW / 2, 355), k.anchor("center")]);

    renderItem();

    // Category label row
    for (const def of btnDefs) {
      k.add([
        k.text(CAT_LABELS[def.cat], { size: 11, font: "sans-serif" }),
        k.color(...CAT_COLORS[def.cat]),
        k.pos(def.x, BTN_Y + 46),
        k.anchor("center"),
      ]);
    }
  });
}
