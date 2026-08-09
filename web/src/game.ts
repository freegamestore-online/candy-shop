// ── Candy Shop Tycoon: Sweet Security ────────────────────────────────────────
// game.ts — KAPLAY entry point. Registers all scenes and drives the daily cycle.
// Scene logic lives in lib/morning.ts, lib/shift.ts, lib/night.ts.

import kaplay from "kaplay";
import { makeInitialState, saveState, clearSave, STAGES, GameState } from "./lib/state";
import { registerMorningScene } from "./lib/morning";
import { registerShiftScene } from "./lib/shift";
import { registerNightScene } from "./lib/night";

const VW = 480;
const VH = 640;

export function startGame(
  canvas: HTMLCanvasElement,
  onScore: (n: number) => void,
): () => void {
  const k = kaplay({
    canvas,
    width: VW,
    height: VH,
    letterbox: true,
    background: [10, 10, 25],
    global: false,
    pixelDensity: Math.min(window.devicePixelRatio || 1, 2),
  });

  // Shared mutable state — passed by reference so all scenes mutate the same object.
  const gs: GameState = makeInitialState();
  onScore(gs.highScore);

  // ── Forward-declared navigation functions ─────────────────────────────────
  // These are defined as `let` so they can reference each other in closures.

  let goMorning: () => void;
  let goShift: () => void;
  let goNight: () => void;
  let goGameOver: (reason: string) => void;

  goMorning = () => {
    registerMorningScene(k, gs, () => goShift());
    k.go("morning");
  };

  goShift = () => {
    registerShiftScene(k, gs, () => goNight());
    k.go("shift");
  };

  goNight = () => {
    registerNightScene(
      k,
      gs,
      () => { onScore(gs.highScore); goMorning(); },
      (reason) => { onScore(gs.highScore); goGameOver(reason); },
    );
    k.go("night");
  };

  // ── Game Over Scene ───────────────────────────────────────────────────────
  goGameOver = (reason: string) => {
    // Register fresh each time so captured values are current
    k.scene("gameover", () => {
      const highScore = gs.highScore;
      const day = gs.day;

      k.add([k.rect(VW, VH), k.color(10, 5, 20), k.pos(0, 0), k.fixed()]);

      const isBankrupt = reason === "bankrupt";

      k.add([
        k.text(isBankrupt ? "💸 BANKRUPT!" : "🔒 SHOP CLOSED!", {
          size: 30,
          font: "sans-serif",
        }),
        k.color(isBankrupt ? 255 : 200, 80, 80),
        k.pos(VW / 2, 100),
        k.anchor("center"),
      ]);

      k.add([
        k.text(
          isBankrupt
            ? "You couldn't cover the rent.\nThe shop has gone bankrupt."
            : "Too many unhappy customers & robberies.\nReputation hit 0% — city inspectors\nshut you down.",
          { size: 13, font: "sans-serif", align: "center", width: 400 },
        ),
        k.color(200, 180, 220),
        k.pos(VW / 2, 185),
        k.anchor("center"),
      ]);

      k.add([
        k.text(`📅 Survived ${day - 1} day${day - 1 === 1 ? "" : "s"}`, {
          size: 18,
          font: "sans-serif",
        }),
        k.color(200, 200, 255),
        k.pos(VW / 2, 270),
        k.anchor("center"),
      ]);

      k.add([
        k.text(`🏆 Best Cash: $${highScore}`, { size: 18, font: "sans-serif" }),
        k.color(255, 220, 80),
        k.pos(VW / 2, 308),
        k.anchor("center"),
      ]);

      const stageReached = STAGES[gs.stageIdx]?.name ?? "";
      k.add([
        k.text(`📍 Reached: ${stageReached}`, { size: 13, font: "sans-serif" }),
        k.color(160, 160, 200),
        k.pos(VW / 2, 344),
        k.anchor("center"),
      ]);

      // Tip
      k.add([
        k.text(
          isBankrupt
            ? "💡 Tip: Serve more customers & upgrade candy tiers for bigger earnings."
            : "💡 Tip: Upgrade Security & keep customers happy to protect your rep.",
          { size: 11, font: "sans-serif", align: "center", width: 400 },
        ),
        k.color(140, 140, 160),
        k.pos(VW / 2, 390),
        k.anchor("center"),
      ]);

      const btn = k.add([
        k.rect(220, 54, { radius: 12 }),
        k.color(80, 60, 160),
        k.pos(VW / 2, 480),
        k.anchor("center"),
        k.area(),
      ]);
      k.add([
        k.text("▶ Play Again", { size: 20, font: "sans-serif" }),
        k.color(255, 255, 255),
        k.pos(VW / 2, 480),
        k.anchor("center"),
      ]);

      btn.onClick(doRestart);
      k.onKeyPress("space", doRestart);
      k.onKeyPress("enter", doRestart);

      function doRestart() {
        clearSave();
        const fresh = makeInitialState();
        // Reset gs in-place — all scene closures share this reference
        gs.cash       = fresh.cash;
        gs.reputation = fresh.reputation;
        gs.day        = fresh.day;
        gs.stageIdx   = fresh.stageIdx;
        gs.gummyTier  = fresh.gummyTier;
        gs.chocoTier  = fresh.chocoTier;
        gs.hardTier   = fresh.hardTier;
        gs.stock      = { ...fresh.stock };
        gs.secLevel   = fresh.secLevel;
        gs.dailyEvent = fresh.dailyEvent;
        gs.highScore  = highScore; // preserve best score
        saveState(gs);
        goMorning();
      }
    });

    k.go("gameover");
  };

  // ── Boot ──────────────────────────────────────────────────────────────────
  goMorning();

  return () => k.quit();
}
