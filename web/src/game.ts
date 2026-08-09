// ── Candy Shop Tycoon — main entry point ──────────────────────────────────────

import kaplay from "kaplay";
import { makeInitialState, saveState, clearSave, GameState } from "./lib/state";
import { registerMorningScene } from "./lib/morning";
import { registerShiftScene } from "./lib/shift";
import { registerNightScene } from "./lib/night";

const VW = 480;
const VH = 640;

type K = ReturnType<typeof kaplay>;

export function startGame(
  canvas: HTMLCanvasElement,
  onScore: (n: number) => void,
): () => void {
  const k: K = kaplay({
    canvas,
    width: VW,
    height: VH,
    letterbox: true,
    background: [10, 8, 20],
    global: false,
    forceCanvas: true,
    pixelDensity: Math.min(window.devicePixelRatio || 1, 2),
  });

  const gs: GameState = makeInitialState();
  onScore(gs.highScore);

  function goMorning() {
    onScore(gs.highScore);
    k.go("morning");
  }
  function goShift() {
    k.go("shift");
  }
  function goNight() {
    k.go("night");
  }
  function goGameOver(reason: string) {
    k.go("gameover", reason);
  }

  registerMorningScene(k, gs, goShift);
  registerShiftScene(k, gs, goNight);
  registerNightScene(k, gs, goMorning, goGameOver);

  // ── Game Over scene ──────────────────────────────────────────────────────
  k.scene("gameover", (reason: string) => {
    k.add([k.rect(VW, VH), k.color(20, 10, 10), k.pos(0, 0), k.fixed()]);

    const title =
      reason === "bankrupt" ? "💸 Bankrupt!" : "🚪 Shop Closed!";
    const subtitle =
      reason === "bankrupt"
        ? "You couldn't pay the rent."
        : "Your reputation hit 0% — city inspectors shut you down.";

    k.add([
      k.text(title, { size: 32, font: "sans-serif" }),
      k.color(255, 80, 80),
      k.pos(VW / 2, 120),
      k.anchor("center"),
    ]);
    k.add([
      k.text(subtitle, { size: 14, font: "sans-serif", width: 380 }),
      k.color(200, 160, 160),
      k.pos(VW / 2, 178),
      k.anchor("center"),
    ]);
    k.add([
      k.text(`🏆 Best Cash: $${gs.highScore}`, { size: 20, font: "sans-serif" }),
      k.color(255, 220, 80),
      k.pos(VW / 2, 230),
      k.anchor("center"),
    ]);
    k.add([
      k.text(`📅 Day ${gs.day - 1} survived`, { size: 16, font: "sans-serif" }),
      k.color(180, 180, 200),
      k.pos(VW / 2, 268),
      k.anchor("center"),
    ]);

    const btn = k.add([
      k.rect(220, 56, { radius: 12 }),
      k.color(80, 60, 160),
      k.pos(VW / 2, 340),
      k.anchor("center"),
      k.area(),
    ]);
    k.add([
      k.text("▶ Play Again", { size: 20, font: "sans-serif" }),
      k.color(255, 255, 255),
      k.pos(VW / 2, 340),
      k.anchor("center"),
    ]);

    // Pulse animation
    let pulse = 0;
    k.onUpdate(() => {
      pulse += k.dt() * 2;
      const s = 1 + Math.sin(pulse) * 0.03;
      btn.width  = 220 * s;
      btn.height = 56 * s;
    });

    function restart() {
      clearSave();
      const fresh = makeInitialState();
      Object.assign(gs, fresh);
      onScore(gs.highScore);
      k.go("morning");
    }

    btn.onClick(restart);
    k.onKeyPress("space", restart);
    k.onKeyPress("enter", restart);

    k.add([
      k.text(
        "Tips: Upgrade candy to earn more per sale.\nKeep reputation above 20% at all costs!",
        { size: 12, font: "sans-serif", width: 380, align: "center" },
      ),
      k.color(160, 160, 180),
      k.pos(VW / 2, 430),
      k.anchor("center"),
    ]);

    k.add([
      k.text("freegamestore.online", { size: 11, font: "sans-serif" }),
      k.color(100, 100, 130),
      k.pos(VW / 2, VH - 18),
      k.anchor("center"),
    ]);

    saveState(gs);
  });

  k.go("morning");

  return () => k.quit();
}
