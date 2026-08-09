// ── Morning Prep Scene ────────────────────────────────────────────────────────
// Player buys stock, upgrades candy tiers, upgrades security, then opens shop.

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
  DailyEvent,
  SEC_COSTS,
  SEC_NAMES,
  currentTier,
  saveState,
} from "./state";

type K = ReturnType<typeof kaplay>;

const VW = 480;
const VH = 640;

const DAILY_EVENTS: DailyEvent[] = ["normal", "normal", "normal", "flash", "bogo", "rainy", "thief_spree"];

function rollEvent(): DailyEvent {
  return DAILY_EVENTS[Math.floor(Math.random() * DAILY_EVENTS.length)]!;
}

export function registerMorningScene(k: K, gs: GameState, onDone: () => void) {
  k.scene("morning", () => {
    // Roll today's event
    gs.dailyEvent = rollEvent();

    // Background
    k.add([k.rect(VW, VH), k.color(20, 15, 35), k.pos(0, 0), k.fixed()]);

    const stage = STAGES[gs.stageIdx]!;

    // Header
    k.add([
      k.text("☀️ Morning Prep", { size: 22, font: "sans-serif" }),
      k.color(255, 220, 80),
      k.pos(VW / 2, 22),
      k.anchor("center"),
    ]);
    k.add([
      k.text(`Day ${gs.day}  —  ${stage.name}`, { size: 13, font: "sans-serif" }),
      k.color(180, 160, 220),
      k.pos(VW / 2, 46),
      k.anchor("center"),
    ]);

    // Cash / Rep
    const cashLbl = k.add([
      k.text(`💰 $${gs.cash}`, { size: 15, font: "sans-serif" }),
      k.color(120, 255, 120),
      k.pos(12, 68),
      k.anchor("topleft"),
    ]);
    const repLbl = k.add([
      k.text(`⭐ ${gs.reputation}%`, { size: 15, font: "sans-serif" }),
      k.color(255, 220, 80),
      k.pos(VW - 12, 68),
      k.anchor("topright"),
    ]);

    function refreshTop() {
      cashLbl.text = `💰 $${gs.cash}`;
      repLbl.text  = `⭐ ${gs.reputation}%`;
    }

    // Today's event card
    const evColor: Record<DailyEvent, [number, number, number]> = {
      normal:      [40, 50, 60],
      flash:       [80, 60, 10],
      bogo:        [10, 70, 50],
      rainy:       [30, 40, 70],
      thief_spree: [80, 20, 20],
    };
    const [er, eg, eb] = evColor[gs.dailyEvent];
    k.add([
      k.rect(440, 62, { radius: 10 }),
      k.color(er, eg, eb),
      k.pos(VW / 2, 112),
      k.anchor("center"),
    ]);
    k.add([
      k.text(`Today: ${EVENT_LABELS[gs.dailyEvent]}`, { size: 15, font: "sans-serif" }),
      k.color(255, 240, 180),
      k.pos(VW / 2, 98),
      k.anchor("center"),
    ]);
    k.add([
      k.text(EVENT_DESC[gs.dailyEvent], { size: 12, font: "sans-serif", width: 420 }),
      k.color(200, 195, 215),
      k.pos(VW / 2, 118),
      k.anchor("center"),
    ]);

    // ── Section: Restock ──────────────────────────────────────────────────────
    k.add([
      k.text("🛒 Restock  ($3 each)", { size: 14, font: "sans-serif" }),
      k.color(160, 200, 255),
      k.pos(14, 152),
      k.anchor("topleft"),
    ]);

    const RESTOCK_COST = 3;
    const cats: CandyCategory[] = ["gummy", "choco", "hard"];
    const catEmoji: Record<CandyCategory, string> = { gummy: "🍬", choco: "🍫", hard: "🍭" };
    const stockLbls: Partial<Record<CandyCategory, ReturnType<K["add"]>>> = {};

    cats.forEach((cat, i) => {
      const y = 178 + i * 44;
      const tier = currentTier(gs, cat);

      k.add([
        k.text(`${catEmoji[cat]} ${tier.name}`, { size: 13, font: "sans-serif" }),
        k.color(220, 215, 235),
        k.pos(14, y),
        k.anchor("topleft"),
      ]);

      const stockLbl = k.add([
        k.text(`×${gs.stock[cat]}`, { size: 13, font: "sans-serif" }),
        k.color(160, 255, 160),
        k.pos(200, y),
        k.anchor("topleft"),
      ]);
      stockLbls[cat] = stockLbl;

      // − button
      const minusBtn = k.add([
        k.rect(36, 32, { radius: 6 }),
        k.color(100, 60, 60),
        k.pos(260, y - 4),
        k.anchor("topleft"),
        k.area(),
      ]);
      k.add([
        k.text("−", { size: 18, font: "sans-serif" }),
        k.color(255, 180, 180),
        k.pos(278, y + 12),
        k.anchor("center"),
      ]);
      minusBtn.onClick(() => {
        if (gs.stock[cat] <= 0) return;
        gs.stock[cat]--;
        gs.cash += RESTOCK_COST;
        const lbl = stockLbls[cat];
        if (lbl) lbl.text = `×${gs.stock[cat]}`;
        refreshTop();
      });

      // + button
      const plusBtn = k.add([
        k.rect(36, 32, { radius: 6 }),
        k.color(40, 100, 60),
        k.pos(304, y - 4),
        k.anchor("topleft"),
        k.area(),
      ]);
      k.add([
        k.text("+", { size: 18, font: "sans-serif" }),
        k.color(160, 255, 180),
        k.pos(322, y + 12),
        k.anchor("center"),
      ]);
      plusBtn.onClick(() => {
        if (gs.cash < RESTOCK_COST) return;
        gs.cash -= RESTOCK_COST;
        gs.stock[cat]++;
        const lbl = stockLbls[cat];
        if (lbl) lbl.text = `×${gs.stock[cat]}`;
        refreshTop();
      });

      // Upgrade button
      const tierIdx = cat === "gummy" ? gs.gummyTier : cat === "choco" ? gs.chocoTier : gs.hardTier;
      const costs = UPGRADE_COSTS[cat];
      const upgradeCost = tierIdx < 2 ? costs[tierIdx]! : null;
      const nextTiers = cat === "gummy" ? GUMMY_TIERS : cat === "choco" ? CHOCO_TIERS : HARD_TIERS;
      const nextTierExists = tierIdx < 2 && nextTiers[tierIdx + 1] !== undefined;

      if (upgradeCost !== null && nextTierExists) {
        const upgBtn = k.add([
          k.rect(120, 32, { radius: 6 }),
          k.color(60, 40, 100),
          k.pos(352, y - 4),
          k.anchor("topleft"),
          k.area(),
        ]);
        const upgLbl = k.add([
          k.text(`⬆ $${upgradeCost}`, { size: 12, font: "sans-serif" }),
          k.color(200, 180, 255),
          k.pos(412, y + 12),
          k.anchor("center"),
        ]);
        upgBtn.onClick(() => {
          if (gs.cash < upgradeCost) return;
          gs.cash -= upgradeCost;
          if (cat === "gummy") gs.gummyTier++;
          else if (cat === "choco") gs.chocoTier++;
          else gs.hardTier++;
          upgLbl.text = "✅ Done";
          upgBtn.color = k.rgb(30, 60, 30);
          refreshTop();
        });
      } else if (tierIdx >= 2) {
        k.add([
          k.text("MAX ✨", { size: 12, font: "sans-serif" }),
          k.color(255, 220, 60),
          k.pos(420, y + 12),
          k.anchor("center"),
        ]);
      }
    });

    // ── Section: Security ─────────────────────────────────────────────────────
    const secY = 320;
    k.add([
      k.text("🔒 Security", { size: 14, font: "sans-serif" }),
      k.color(160, 200, 255),
      k.pos(14, secY),
      k.anchor("topleft"),
    ]);
    k.add([
      k.text(SEC_NAMES[gs.secLevel]!, { size: 13, font: "sans-serif" }),
      k.color(200, 195, 220),
      k.pos(14, secY + 24),
      k.anchor("topleft"),
    ]);

    if (gs.secLevel < 3) {
      const secCost = SEC_COSTS[gs.secLevel]!;
      const secBtn = k.add([
        k.rect(180, 36, { radius: 8 }),
        k.color(50, 40, 100),
        k.pos(VW - 14, secY + 16),
        k.anchor("topright"),
        k.area(),
      ]);
      const secBtnLbl = k.add([
        k.text(`⬆ Upgrade  $${secCost}`, { size: 13, font: "sans-serif" }),
        k.color(200, 180, 255),
        k.pos(VW - 14 - 90, secY + 34),
        k.anchor("center"),
      ]);
      secBtn.onClick(() => {
        if (gs.cash < secCost) return;
        gs.cash -= secCost;
        gs.secLevel++;
        secBtnLbl.text = gs.secLevel < 3 ? `⬆ Upgrade  $${SEC_COSTS[gs.secLevel]!}` : "MAX 🔒";
        secBtn.color = gs.secLevel < 3 ? k.rgb(50, 40, 100) : k.rgb(30, 60, 30);
        refreshTop();
      });
    } else {
      k.add([
        k.text("MAX 🔒", { size: 13, font: "sans-serif" }),
        k.color(255, 220, 60),
        k.pos(VW - 14, secY + 34),
        k.anchor("topright"),
      ]);
    }

    // ── Rent reminder ─────────────────────────────────────────────────────────
    k.add([
      k.text(`🏠 Tonight's rent: $${stage.rent}`, { size: 13, font: "sans-serif" }),
      k.color(255, 160, 80),
      k.pos(14, 378),
      k.anchor("topleft"),
    ]);
    if (stage.target !== null) {
      k.add([
        k.text(`🎯 Stage target: $${stage.target} cash`, { size: 13, font: "sans-serif" }),
        k.color(180, 220, 255),
        k.pos(14, 400),
        k.anchor("topleft"),
      ]);
    } else {
      k.add([
        k.text("🎯 Endless mode — survive as long as you can!", { size: 13, font: "sans-serif" }),
        k.color(180, 220, 255),
        k.pos(14, 400),
        k.anchor("topleft"),
      ]);
    }

    // ── Open Shop button ──────────────────────────────────────────────────────
    const openBtn = k.add([
      k.rect(280, 62, { radius: 14 }),
      k.color(80, 180, 80),
      k.pos(VW / 2, 470),
      k.anchor("center"),
      k.area(),
    ]);
    k.add([
      k.text("🛍️ Open the Shop!", { size: 22, font: "sans-serif" }),
      k.color(255, 255, 255),
      k.pos(VW / 2, 470),
      k.anchor("center"),
    ]);

    let pulse = 0;
    k.onUpdate(() => {
      pulse += k.dt() * 2;
      const s = 1 + Math.sin(pulse) * 0.03;
      openBtn.width  = 280 * s;
      openBtn.height = 62 * s;
    });

    openBtn.onClick(() => { saveState(gs); onDone(); });
    k.onKeyPress("enter", () => { saveState(gs); onDone(); });
    k.onKeyPress("space", () => { saveState(gs); onDone(); });

    // Attribution
    k.add([
      k.text("freegamestore.online", { size: 10, font: "sans-serif" }),
      k.color(60, 55, 80),
      k.pos(VW / 2, VH - 14),
      k.anchor("center"),
    ]);
  });
}
