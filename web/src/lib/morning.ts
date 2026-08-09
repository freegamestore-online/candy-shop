// ── Morning Prep Scene ────────────────────────────────────────────────────────
// Player buys stock, upgrades candy tiers, upgrades security, then starts shift.

import kaplay from "kaplay";
import {
  GameState,
  CandyCategory,
  GUMMY_TIERS,
  CHOCO_TIERS,
  HARD_TIERS,
  UPGRADE_COSTS,
  STAGES,
  EVENT_LABELS,
  EVENT_DESC,
  SEC_COSTS,
  SEC_NAMES,
  currentTier,
  saveState,
} from "./state";

type K = ReturnType<typeof kaplay>;

const VW = 480;
const VH = 640;
const STOCK_COST = 8;

function rollDailyEvent(gs: GameState) {
  const events: GameState["dailyEvent"][] = [
    "normal", "normal", "normal", "flash", "bogo", "rainy", "thief_spree",
  ];
  gs.dailyEvent = events[Math.floor(Math.random() * events.length)]!;
}

export function registerMorningScene(k: K, gs: GameState, onDone: () => void) {
  k.scene("morning", () => {
    rollDailyEvent(gs);
    saveState(gs);

    k.add([k.rect(VW, VH), k.color(20, 16, 40), k.pos(0, 0), k.fixed()]);

    const stage = STAGES[gs.stageIdx]!;
    k.add([
      k.text(`☀️ Morning Prep — Day ${gs.day}`, { size: 20, font: "sans-serif" }),
      k.color(255, 220, 80),
      k.pos(VW / 2, 22),
      k.anchor("center"),
    ]);
    k.add([
      k.text(stage.name, { size: 13, font: "sans-serif" }),
      k.color(180, 160, 220),
      k.pos(VW / 2, 46),
      k.anchor("center"),
    ]);

    const cashLabel = k.add([
      k.text(`💰 $${gs.cash}`, { size: 18, font: "sans-serif" }),
      k.color(120, 255, 120),
      k.pos(VW / 2, 72),
      k.anchor("center"),
    ]);
    function refreshCash() { cashLabel.text = `💰 $${gs.cash}`; }

    // Daily event banner
    k.add([
      k.rect(440, 52, { radius: 10 }),
      k.color(40, 30, 70),
      k.pos(VW / 2, 108),
      k.anchor("center"),
    ]);
    k.add([
      k.text(`Today: ${EVENT_LABELS[gs.dailyEvent]}`, { size: 14, font: "sans-serif" }),
      k.color(255, 200, 100),
      k.pos(VW / 2, 96),
      k.anchor("center"),
    ]);
    k.add([
      k.text(EVENT_DESC[gs.dailyEvent], { size: 11, font: "sans-serif", width: 420 }),
      k.color(180, 170, 200),
      k.pos(VW / 2, 116),
      k.anchor("center"),
    ]);

    // ── Buy Stock ─────────────────────────────────────────────────────────────
    k.add([
      k.text("🛒 Buy Stock  ($8 each)", { size: 14, font: "sans-serif" }),
      k.color(200, 200, 255),
      k.pos(20, 148),
      k.anchor("left"),
    ]);

    const cats: CandyCategory[] = ["gummy", "choco", "hard"];
    const CAT_COLORS: Record<CandyCategory, [number, number, number]> = {
      gummy: [255, 100, 180],
      choco: [160, 100,  60],
      hard:  [100, 200, 255],
    };

    cats.forEach((cat, i) => {
      const y = 178 + i * 50;
      const tier = currentTier(gs, cat);

      const lbl = k.add([
        k.text(`${tier.name}  ×${gs.stock[cat]}`, { size: 13, font: "sans-serif" }),
        k.color(...CAT_COLORS[cat]),
        k.pos(24, y),
        k.anchor("left"),
      ]);

      function refreshStock() {
        const t = currentTier(gs, cat);
        lbl.text = `${t.name}  ×${gs.stock[cat]}`;
      }

      const btn = k.add([
        k.rect(90, 36, { radius: 8 }),
        k.color(50, 80, 50),
        k.pos(VW - 24, y),
        k.anchor("right"),
        k.area(),
      ]);
      k.add([
        k.text(`+5 ($${STOCK_COST * 5})`, { size: 12, font: "sans-serif" }),
        k.color(180, 255, 180),
        k.pos(VW - 24 - 45, y),
        k.anchor("center"),
      ]);

      btn.onClick(() => {
        const cost = STOCK_COST * 5;
        if (gs.cash >= cost) {
          gs.cash -= cost;
          gs.stock[cat] += 5;
          refreshStock();
          refreshCash();
          saveState(gs);
        }
      });
    });

    // ── Upgrade Candy ─────────────────────────────────────────────────────────
    k.add([
      k.text("⬆️ Upgrade Candy", { size: 14, font: "sans-serif" }),
      k.color(200, 200, 255),
      k.pos(20, 332),
      k.anchor("left"),
    ]);

    cats.forEach((cat, i) => {
      const y = 362 + i * 44;
      const tiers = cat === "gummy" ? GUMMY_TIERS : cat === "choco" ? CHOCO_TIERS : HARD_TIERS;
      const costs = UPGRADE_COSTS[cat];
      const maxTier = 2;

      const getTierIdx = () =>
        cat === "gummy" ? gs.gummyTier : cat === "choco" ? gs.chocoTier : gs.hardTier;

      const tierLbl = k.add([
        k.text(`${tiers[getTierIdx()]!.name}  (Tier ${getTierIdx() + 1}/3)`, {
          size: 12,
          font: "sans-serif",
        }),
        k.color(...CAT_COLORS[cat]),
        k.pos(24, y),
        k.anchor("left"),
      ]);

      function refreshTier() {
        const ti = getTierIdx();
        tierLbl.text = `${tiers[ti]!.name}  (Tier ${ti + 1}/3)`;
      }

      const tierIdx = getTierIdx();
      if (tierIdx < maxTier) {
        const cost = costs[tierIdx]!;
        const btn = k.add([
          k.rect(110, 34, { radius: 8 }),
          k.color(60, 50, 100),
          k.pos(VW - 24, y),
          k.anchor("right"),
          k.area(),
        ]);
        k.add([
          k.text(`Upgrade $${cost}`, { size: 11, font: "sans-serif" }),
          k.color(200, 180, 255),
          k.pos(VW - 24 - 55, y),
          k.anchor("center"),
        ]);

        btn.onClick(() => {
          const ti = getTierIdx();
          if (ti >= maxTier) return;
          const c = costs[ti]!;
          if (gs.cash >= c) {
            gs.cash -= c;
            if (cat === "gummy") gs.gummyTier++;
            else if (cat === "choco") gs.chocoTier++;
            else gs.hardTier++;
            refreshTier();
            refreshCash();
            saveState(gs);
          }
        });
      } else {
        k.add([
          k.text("✅ MAX", { size: 12, font: "sans-serif" }),
          k.color(80, 220, 80),
          k.pos(VW - 24, y),
          k.anchor("right"),
        ]);
      }
    });

    // ── Security ──────────────────────────────────────────────────────────────
    k.add([
      k.text("🔒 Security", { size: 14, font: "sans-serif" }),
      k.color(200, 200, 255),
      k.pos(20, 498),
      k.anchor("left"),
    ]);

    const secLbl = k.add([
      k.text(`${SEC_NAMES[gs.secLevel]!}  (Level ${gs.secLevel}/3)`, {
        size: 12,
        font: "sans-serif",
      }),
      k.color(180, 200, 255),
      k.pos(24, 522),
      k.anchor("left"),
    ]);
    function refreshSec() {
      secLbl.text = `${SEC_NAMES[gs.secLevel]!}  (Level ${gs.secLevel}/3)`;
    }

    if (gs.secLevel < 3) {
      const secCost = SEC_COSTS[gs.secLevel]!;
      const secBtn = k.add([
        k.rect(130, 36, { radius: 8 }),
        k.color(60, 60, 100),
        k.pos(VW - 24, 522),
        k.anchor("right"),
        k.area(),
      ]);
      k.add([
        k.text(`Upgrade $${secCost}`, { size: 12, font: "sans-serif" }),
        k.color(180, 180, 255),
        k.pos(VW - 24 - 65, 522),
        k.anchor("center"),
      ]);
      secBtn.onClick(() => {
        if (gs.secLevel >= 3) return;
        const c = SEC_COSTS[gs.secLevel]!;
        if (gs.cash >= c) {
          gs.cash -= c;
          gs.secLevel++;
          refreshSec();
          refreshCash();
          saveState(gs);
        }
      });
    } else {
      k.add([
        k.text("✅ MAX", { size: 12, font: "sans-serif" }),
        k.color(80, 220, 80),
        k.pos(VW - 24, 522),
        k.anchor("right"),
      ]);
    }

    // ── Start Shift button ────────────────────────────────────────────────────
    const startBtn = k.add([
      k.rect(260, 58, { radius: 14 }),
      k.color(200, 80, 200),
      k.pos(VW / 2, 590),
      k.anchor("center"),
      k.area(),
    ]);
    k.add([
      k.text("▶ Open the Shop!", { size: 20, font: "sans-serif" }),
      k.color(255, 255, 255),
      k.pos(VW / 2, 590),
      k.anchor("center"),
    ]);

    let pulse = 0;
    k.onUpdate(() => {
      pulse += k.dt() * 2;
      const s = 1 + Math.sin(pulse) * 0.03;
      startBtn.width  = 260 * s;
      startBtn.height = 58 * s;
    });

    startBtn.onClick(onDone);
    k.onKeyPress("enter", onDone);
    k.onKeyPress("space", onDone);

    k.add([
      k.text("freegamestore.online", { size: 10, font: "sans-serif" }),
      k.color(60, 50, 80),
      k.pos(VW / 2, VH - 10),
      k.anchor("center"),
    ]);
  });
}
