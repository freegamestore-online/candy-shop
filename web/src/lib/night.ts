// ── Night Phase Scene ─────────────────────────────────────────────────────────
// Pay rent, check progression, spend on upgrades, then start next day.

import kaplay from "kaplay";
import {
  GameState,
  STAGES,
  UPGRADE_COSTS,
  SEC_COSTS,
  SEC_NAMES,
  GUMMY_TIERS,
  CHOCO_TIERS,
  HARD_TIERS,
  saveState,
} from "./state";

type K = ReturnType<typeof kaplay>;

const VW = 480;
const VH = 640;

export function registerNightScene(
  k: K,
  gs: GameState,
  onNextDay: () => void,
  onGameOver: (reason: string) => void,
) {
  k.scene("night", () => {
    const stage = STAGES[gs.stageIdx]!;
    gs.cash -= stage.rent;

    // Check progression
    let promoted = false;
    if (
      stage.target !== null &&
      gs.cash >= stage.target &&
      gs.stageIdx < STAGES.length - 1
    ) {
      gs.stageIdx++;
      promoted = true;
    }

    // Update high score
    if (gs.cash > gs.highScore) gs.highScore = Math.floor(gs.cash);
    gs.day++;
    saveState(gs);

    // Failure checks — run BEFORE rendering
    if (gs.cash < 0) { onGameOver("bankrupt"); return; }
    if (gs.reputation <= 0) { onGameOver("closure"); return; }

    // Background
    k.add([k.rect(VW, VH), k.color(10, 10, 30), k.pos(0, 0), k.fixed()]);

    k.add([
      k.text("🌙 Night Report", { size: 24, font: "sans-serif" }),
      k.color(200, 180, 255),
      k.pos(VW / 2, 28),
      k.anchor("center"),
    ]);

    const newStage = STAGES[gs.stageIdx]!;
    if (promoted) {
      k.add([
        k.rect(440, 36, { radius: 8 }),
        k.color(60, 40, 100),
        k.pos(VW / 2, 60),
        k.anchor("center"),
      ]);
      k.add([
        k.text(`🎉 Promoted to: ${newStage.name}!`, { size: 14, font: "sans-serif" }),
        k.color(255, 220, 80),
        k.pos(VW / 2, 60),
        k.anchor("center"),
      ]);
    } else {
      k.add([
        k.text(`📍 ${stage.name}`, { size: 13, font: "sans-serif" }),
        k.color(160, 160, 200),
        k.pos(VW / 2, 60),
        k.anchor("center"),
      ]);
    }

    k.add([
      k.text(
        `💰 Cash: $${gs.cash.toFixed(0)}   ⭐ Rep: ${gs.reputation}%   🏆 Best: $${gs.highScore}`,
        { size: 13, font: "sans-serif" },
      ),
      k.color(160, 220, 160),
      k.pos(VW / 2, 84),
      k.anchor("center"),
    ]);

    k.add([
      k.text(`Rent paid: $${stage.rent}`, { size: 12, font: "sans-serif" }),
      k.color(200, 120, 120),
      k.pos(VW / 2, 102),
      k.anchor("center"),
    ]);

    if (newStage.target !== null) {
      k.add([
        k.text(`Next promotion at: $${newStage.target}`, { size: 12, font: "sans-serif" }),
        k.color(160, 160, 200),
        k.pos(VW / 2, 120),
        k.anchor("center"),
      ]);
    } else {
      k.add([
        k.text("🏆 Confectionery Empire — Survival Mode!", { size: 12, font: "sans-serif" }),
        k.color(255, 200, 80),
        k.pos(VW / 2, 120),
        k.anchor("center"),
      ]);
    }

    // ── Upgrade Shop ──────────────────────────────────────────────────────────
    k.add([
      k.text("🛒 Upgrade Shop", { size: 18, font: "sans-serif" }),
      k.color(255, 220, 80),
      k.pos(VW / 2, 146),
      k.anchor("center"),
    ]);

    const SHOP_Y = 170;

    const cashLabel = k.add([
      k.text(`Cash: $${gs.cash.toFixed(0)}`, { size: 14, font: "sans-serif" }),
      k.color(160, 255, 160),
      k.pos(VW / 2, SHOP_Y),
      k.anchor("center"),
    ]);

    function refreshCash() {
      cashLabel.text = `Cash: $${gs.cash.toFixed(0)}`;
    }

    type CandyUpgradeDef = {
      label: string;
      tier: () => number;
      cost: () => number | null;
      nextName: () => string;
      doUpgrade: () => void;
    };

    const candyDefs: CandyUpgradeDef[] = [
      {
        label: "Gummies",
        tier: () => gs.gummyTier,
        cost: () => (gs.gummyTier < 2 ? UPGRADE_COSTS.gummy[gs.gummyTier]! : null),
        nextName: () => GUMMY_TIERS[gs.gummyTier + 1]?.name ?? "",
        doUpgrade: () => { gs.gummyTier++; },
      },
      {
        label: "Chocolates",
        tier: () => gs.chocoTier,
        cost: () => (gs.chocoTier < 2 ? UPGRADE_COSTS.choco[gs.chocoTier]! : null),
        nextName: () => CHOCO_TIERS[gs.chocoTier + 1]?.name ?? "",
        doUpgrade: () => { gs.chocoTier++; },
      },
      {
        label: "Hard Candy",
        tier: () => gs.hardTier,
        cost: () => (gs.hardTier < 2 ? UPGRADE_COSTS.hard[gs.hardTier]! : null),
        nextName: () => HARD_TIERS[gs.hardTier + 1]?.name ?? "",
        doUpgrade: () => { gs.hardTier++; },
      },
    ];

    // Track upgrade UI objects for rebuilding
    const upgradeObjs: ReturnType<K["add"]>[] = [];

    function buildUpgradeUI() {
      for (const obj of upgradeObjs) k.destroy(obj);
      upgradeObjs.length = 0;

      let y = SHOP_Y + 24;

      // Candy upgrades
      for (const def of candyDefs) {
        const cost    = def.cost();
        const tierIdx = def.tier();
        const tiers   =
          def.label === "Gummies"
            ? GUMMY_TIERS
            : def.label === "Chocolates"
              ? CHOCO_TIERS
              : HARD_TIERS;
        const curName  = tiers[tierIdx]?.name  ?? "";
        const curPrice = tiers[tierIdx]?.price ?? 0;

        if (cost === null) {
          const lbl = k.add([
            k.text(`${def.label}: ${curName} ($${curPrice}) ✅ MAX`, { size: 11, font: "sans-serif" }),
            k.color(80, 200, 80),
            k.pos(VW / 2, y),
            k.anchor("center"),
          ]);
          upgradeObjs.push(lbl);
        } else {
          const nextName  = def.nextName();
          const canAfford = gs.cash >= cost;

          const lbl = k.add([
            k.text(
              `${def.label}: ${curName}($${curPrice}) → ${nextName}`,
              { size: 10, font: "sans-serif" },
            ),
            k.color(200, 200, 220),
            k.pos(VW / 2 - 60, y),
            k.anchor("center"),
          ]);
          upgradeObjs.push(lbl);

          const btn = k.add([
            k.rect(90, 26, { radius: 6 }),
            k.color(
              canAfford ? 60 : 40,
              canAfford ? 160 : 60,
              canAfford ? 80 : 40,
            ),
            k.pos(VW / 2 + 90, y),
            k.anchor("center"),
            k.area(),
          ]);
          const btnLbl = k.add([
            k.text(`$${cost}`, { size: 12, font: "sans-serif" }),
            k.color(255, 255, 255),
            k.pos(VW / 2 + 90, y),
            k.anchor("center"),
          ]);
          upgradeObjs.push(btn, btnLbl);

          const capturedDef  = def;
          const capturedCost = cost;
          btn.onClick(() => {
            if (gs.cash < capturedCost) return;
            gs.cash -= capturedCost;
            capturedDef.doUpgrade();
            refreshCash();
            buildUpgradeUI();
            saveState(gs);
          });
        }
        y += 28;
      }

      // Security upgrade
      const secY     = y + 4;
      const curSec   = SEC_NAMES[gs.secLevel] ?? "Unknown";

      if (gs.secLevel >= 3) {
        const lbl = k.add([
          k.text(`🔒 Security: ${curSec} ✅ MAX`, { size: 11, font: "sans-serif" }),
          k.color(80, 200, 80),
          k.pos(VW / 2, secY),
          k.anchor("center"),
        ]);
        upgradeObjs.push(lbl);
      } else {
        const cost      = SEC_COSTS[gs.secLevel]!;
        const nextSec   = SEC_NAMES[gs.secLevel + 1] ?? "";
        const canAfford = gs.cash >= cost;

        const lbl = k.add([
          k.text(`🔒 Security: ${curSec} → ${nextSec}`, { size: 10, font: "sans-serif" }),
          k.color(200, 200, 220),
          k.pos(VW / 2 - 60, secY),
          k.anchor("center"),
        ]);
        const btn = k.add([
          k.rect(90, 26, { radius: 6 }),
          k.color(
            canAfford ? 60 : 40,
            canAfford ? 120 : 60,
            canAfford ? 200 : 80,
          ),
          k.pos(VW / 2 + 90, secY),
          k.anchor("center"),
          k.area(),
        ]);
        const btnLbl = k.add([
          k.text(`$${cost}`, { size: 12, font: "sans-serif" }),
          k.color(255, 255, 255),
          k.pos(VW / 2 + 90, secY),
          k.anchor("center"),
        ]);
        upgradeObjs.push(lbl, btn, btnLbl);

        const capturedCost = cost;
        btn.onClick(() => {
          if (gs.cash < capturedCost) return;
          gs.cash -= capturedCost;
          gs.secLevel++;
          refreshCash();
          buildUpgradeUI();
          saveState(gs);
        });
      }
    }

    buildUpgradeUI();

    // Reputation warning
    if (gs.reputation < 20) {
      k.add([
        k.text(`⚠️ Rep critically low: ${gs.reputation}%`, { size: 12, font: "sans-serif" }),
        k.color(255, 80, 80),
        k.pos(VW / 2, VH - 130),
        k.anchor("center"),
      ]);
    }

    // Next Day button
    const nextBtn = k.add([
      k.rect(200, 52, { radius: 10 }),
      k.color(80, 60, 160),
      k.pos(VW / 2, VH - 80),
      k.anchor("center"),
      k.area(),
    ]);
    k.add([
      k.text("▶ Next Day", { size: 18, font: "sans-serif" }),
      k.color(255, 255, 255),
      k.pos(VW / 2, VH - 80),
      k.anchor("center"),
    ]);
    nextBtn.onClick(() => { saveState(gs); onNextDay(); });
    k.onKeyPress("enter", () => { saveState(gs); onNextDay(); });
    k.onKeyPress("space", () => { saveState(gs); onNextDay(); });

    // Platform attribution
    k.add([
      k.text("freegamestore.online", { size: 10, font: "sans-serif" }),
      k.color(80, 80, 110),
      k.pos(VW / 2, VH - 18),
      k.anchor("center"),
    ]);
  });
}
