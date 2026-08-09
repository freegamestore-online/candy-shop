// ── Night Phase Scene ─────────────────────────────────────────────────────────
// Pay rent, check progression, spend on upgrades, then start next day.

import kaplay from "kaplay";
import {
  GameState, STAGES, UPGRADE_COSTS, SEC_COSTS, SEC_NAMES,
  GUMMY_TIERS, CHOCO_TIERS, HARD_TIERS,
  clampRep, saveState, clearSave,
} from "./state";

type K = ReturnType<typeof kaplay>;

const VW = 480, VH = 640;

export function registerNightScene(
  k: K,
  gs: GameState,
  onNextDay: () => void,
  onGameOver: (reason: string) => void,
) {
  k.scene("night", () => {
    // ── Pay rent ──────────────────────────────────────────────────────────────
    const stage = STAGES[gs.stageIdx]!;
    gs.cash -= stage.rent;

    // ── Check progression ─────────────────────────────────────────────────────
    let promoted = false;
    if (stage.target !== null && gs.cash >= stage.target && gs.stageIdx < STAGES.length - 1) {
      gs.stageIdx++;
      promoted = true;
    }

    // ── Update high score ─────────────────────────────────────────────────────
    if (gs.cash > gs.highScore) gs.highScore = Math.floor(gs.cash);
    gs.day++;
    saveState(gs);

    // ── Failure checks ────────────────────────────────────────────────────────
    if (gs.cash < 0) { onGameOver("bankrupt"); return; }
    if (gs.reputation <= 0) { onGameOver("closure"); return; }

    // ── Background ────────────────────────────────────────────────────────────
    k.add([k.rect(VW, VH), k.color(10, 10, 30), k.pos(0, 0), k.fixed()]);

    k.add([k.text("🌙 Night Report", { size: 24, font: "sans-serif" }), k.color(200, 180, 255), k.pos(VW / 2, 28), k.anchor("center")]);

    // Stage info
    const newStage = STAGES[gs.stageIdx]!;
    if (promoted) {
      k.add([k.rect(440, 36, { radius: 8 }), k.color(60, 40, 100), k.pos(VW / 2, 60), k.anchor("center")]);
      k.add([k.text(`🎉 Promoted to: ${newStage.name}!`, { size: 14, font: "sans-serif" }), k.color(255, 220, 80), k.pos(VW / 2, 60), k.anchor("center")]);
    } else {
      k.add([k.text(`📍 ${stage.name}`, { size: 13, font: "sans-serif" }), k.color(160, 160, 200), k.pos(VW / 2, 60), k.anchor("center")]);
    }

    // Stats
    k.add([
      k.text(
        `💰 Cash: $${gs.cash.toFixed(0)}   ⭐ Rep: ${gs.reputation}%   🏆 Best: $${gs.highScore}`,
        { size: 13, font: "sans-serif" }
      ),
      k.color(160, 220, 160), k.pos(VW / 2, 85), k.anchor("center"),
    ]);

    // Rent paid
    k.add([
      k.text(`Rent paid: $${stage.rent}`, { size: 12, font: "sans-serif" }),
      k.color(200, 120, 120), k.pos(VW / 2, 106), k.anchor("center"),
    ]);

    // Progression target
    if (newStage.target !== null) {
      k.add([
        k.text(`Next promotion at: $${newStage.target}`, { size: 12, font: "sans-serif" }),
        k.color(160, 160, 200), k.pos(VW / 2, 124), k.anchor("center"),
      ]);
    } else {
      k.add([
        k.text("🏆 Confectionery Empire — Survival Mode!", { size: 12, font: "sans-serif" }),
        k.color(255, 200, 80), k.pos(VW / 2, 124), k.anchor("center"),
      ]);
    }

    // ── Upgrade Shop ──────────────────────────────────────────────────────────
    k.add([k.text("🛒 Upgrade Shop", { size: 18, font: "sans-serif" }), k.color(255, 220, 80), k.pos(VW / 2, 152), k.anchor("center")]);

    let shopY = 178;
    const cashLabel = k.add([
      k.text(`Cash: $${gs.cash.toFixed(0)}`, { size: 14, font: "sans-serif" }),
      k.color(160, 255, 160), k.pos(VW / 2, shopY), k.anchor("center"),
    ]);
    shopY += 22;

    function refreshCash() { cashLabel.text = `Cash: $${gs.cash.toFixed(0)}`; }

    // Candy upgrade buttons
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
        cost: () => gs.gummyTier < 2 ? UPGRADE_COSTS.gummy[gs.gummyTier]! : null,
        nextName: () => GUMMY_TIERS[gs.gummyTier + 1]?.name ?? "",
        doUpgrade: () => { gs.gummyTier++; },
      },
      {
        label: "Chocolates",
        tier: () => gs.chocoTier,
        cost: () => gs.chocoTier < 2 ? UPGRADE_COSTS.choco[gs.chocoTier]! : null,
        nextName: () => CHOCO_TIERS[gs.chocoTier + 1]?.name ?? "",
        doUpgrade: () => { gs.chocoTier++; },
      },
      {
        label: "Hard Candy",
        tier: () => gs.hardTier,
        cost: () => gs.hardTier < 2 ? UPGRADE_COSTS.hard[gs.hardTier]! : null,
        nextName: () => HARD_TIERS[gs.hardTier + 1]?.name ?? "",
        doUpgrade: () => { gs.hardTier++; },
      },
    ];

    const upgradeLabels: ReturnType<K["add"]>[] = [];
    const upgradeBtns: ReturnType<K["add"]>[] = [];

    function buildCandyUpgrades() {
      // Clear old
      for (const obj of upgradeLabels) k.destroy(obj);
      for (const obj of upgradeBtns) k.destroy(obj);
      upgradeLabels.length = 0;
      upgradeBtns.length = 0;

      let y = shopY;
      for (const def of candyDefs) {
        const cost = def.cost();
        const tierIdx = def.tier();
        const curTiers = def.label === "Gummies" ? GUMMY_TIERS : def.label === "Chocolates" ? CHOCO_TIERS : HARD_TIERS;
        const curName = curTiers[tierIdx]?.name ?? "";
        const curPrice = curTiers[tierIdx]?.price ?? 0;

        if (cost === null) {
          const lbl = k.add([
            k.text(`${def.label}: ${curName} ($${curPrice}) ✅ MAX`, { size: 11, font: "sans-serif" }),
            k.color(80, 200, 80), k.pos(VW / 2, y), k.anchor("center"),
          ]);
          upgradeLabels.push(lbl);
        } else {
          const nextName = def.nextName();
          const lbl = k.add([
            k.text(`${def.label}: ${curName}($${curPrice}) → ${nextName}`, { size: 10, font: "sans-serif" }),
            k.color(200, 200, 220), k.pos(VW / 2 - 60, y), k.anchor("center"),
          ]);
          upgradeLabels.push(lbl);

          const canAfford = gs.cash >= cost;
          const btn = k.add([
            k.rect(90, 26, { radius: 6 }),
            k.color(canAfford ? 60 : 40, canAfford ? 160 : 60, canAfford ? 80 : 40),
            k.pos(VW / 2 + 90, y),
            k.anchor("center"),
            k.area(),
          ]);
          const btnLbl = k.add([
            k.text(`$${cost}`, { size: 12, font: "sans-serif" }),
            k.color(255, 255, 255), k.pos(VW / 2 + 90, y), k.anchor("center"),
          ]);
          upgradeBtns.push(btn);
          upgradeLabels.push(btnLbl);

          const capturedDef = def;
          const capturedCost = cost;
          btn.onClick(() => {
            if (gs.cash < capturedCost) return;
            gs.cash -= capturedCost;
            capturedDef.doUpgrade();
            refreshCash();
            buildCandyUpgrades();
            buildSecUpgrade();
            saveState(gs);
          });
        }
        y += 28;
      }
    }

    // Security upgrade
    let secBtnObj: ReturnType<K["add"]> | null = null;
    let secLblObj: ReturnType<K["add"]> | null = null;
    let secBtnLbl: ReturnType<K["add"]> | null = null;

    function buildSecUpgrade() {
      if (secBtnObj) k.destroy(secBtnObj);
      if (secLblObj) k.destroy(secLblObj);
      if (secBtnLbl) k.destroy(secBtnLbl);
      secBtnObj = null; secLblObj = null; secBtnLbl = null;

      const secY = shopY + 3 * 28 + 8;
      const curSec = SEC_NAMES[gs.secLevel] ?? "Unknown";

      if (gs.secLevel >= 3) {
        secLblObj = k.add([
          k.text(`🔒 Security: ${curSec} ✅ MAX`, { size: 11, font: "sans-serif" }),
          k.color(80, 200, 80), k.pos(VW / 2, secY), k.anchor("center"),
        ]);
      } else {
        const cost = SEC_COSTS[gs.secLevel]!;
        const nextSec = SEC_NAMES[gs.secLevel + 1] ?? "";
        secLblObj = k.add([
          k.text(`🔒 Security: ${curSec} → ${nextSec}`, { size: 10, font: "sans-serif" }),
          k.color(200, 200, 220), k.pos(VW / 2 - 60, secY), k.anchor("center"),
        ]);
        const canAfford = gs.cash >= cost;
        secBtnObj = k.add([
          k.rect(90, 26, { radius: 6 }),
          k.color(canAfford ? 60 : 40, canAfford ? 120 : 60, canAfford ? 200 : 80),
          k.pos(VW / 2 + 90, secY),
          k.anchor("center"),
          k.area(),
        ]);
        secBtnLbl = k.add([
          k.text(`$${cost}`, { size: 12, font: "sans-serif" }),
          k.color(255, 255, 255), k.pos(VW / 2 + 90, secY), k.anchor("center"),
        ]);
        const capturedCost = cost;
        secBtnObj.onClick(() => {
          if (gs.cash < capturedCost) return;
          gs.cash -= capturedCost;
          gs.secLevel++;
          refreshCash();
          buildCandyUpgrades();
          buildSecUpgrade();
          saveState(gs);
        });
      }
    }

    buildCandyUpgrades();
    buildSecUpgrade();

    // ── Next Day button ───────────────────────────────────────────────────────
    const nextBtn = k.add([
      k.rect(200, 52, { radius: 10 }),
      k.color(80, 60, 160),
      k.pos(VW / 2, VH - 80),
      k.anchor("center"),
      k.area(),
    ]);
    k.add([
      k.text("▶ Next Day", { size: 18, font: "sans-serif" }),
      k.color(255, 255, 255), k.pos(VW / 2, VH - 80), k.anchor("center"),
    ]);
    nextBtn.onClick(() => {
      saveState(gs);
      onNextDay();
    });
    k.onKeyPress("enter", () => { saveState(gs); onNextDay(); });
    k.onKeyPress("space", () => { saveState(gs); onNextDay(); });

    // Reputation warning
    if (gs.reputation < 20) {
      k.add([
        k.text(`⚠️ Rep critically low: ${gs.reputation}%`, { size: 12, font: "sans-serif" }),
        k.color(255, 80, 80), k.pos(VW / 2, VH - 130), k.anchor("center"),
      ]);
    }

    // FreeGameStore attribution (required by platform smoke test)
    k.add([
      k.text("freegamestore.online", { size: 10, font: "sans-serif" }),
      k.color(80, 80, 110),
      k.pos(VW / 2, VH - 18),
      k.anchor("center"),
    ]);

    // Suppress unused import warning
    void clearSave;
  });
}
