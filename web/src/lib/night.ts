// ── Night Review Scene ────────────────────────────────────────────────────────
// Pay rent, check stage progress, handle game-over or stage-up.

import kaplay from "kaplay";
import {
  GameState,
  STAGES,
  saveState,
  clearSave,
  clampRep,
} from "./state";

type K = ReturnType<typeof kaplay>;

const VW = 480;
const VH = 640;

export function registerNightScene(
  k: K,
  gs: GameState,
  onMorning: () => void,
  onGameOver: (reason: string) => void,
) {
  k.scene("night", () => {
    k.add([k.rect(VW, VH), k.color(10, 10, 25), k.pos(0, 0), k.fixed()]);

    const stage = STAGES[gs.stageIdx]!;

    k.add([
      k.text("🌙 End of Day", { size: 26, font: "sans-serif" }),
      k.color(180, 160, 255),
      k.pos(VW / 2, 30),
      k.anchor("center"),
    ]);
    k.add([
      k.text(`Day ${gs.day}  ·  ${stage.name}`, { size: 14, font: "sans-serif" }),
      k.color(140, 130, 170),
      k.pos(VW / 2, 60),
      k.anchor("center"),
    ]);

    // ── Pay rent ──────────────────────────────────────────────────────────────
    const rentDue = stage.rent;
    const cashBefore = gs.cash;
    gs.cash = Math.max(0, gs.cash - rentDue);

    // ── Rep decay ─────────────────────────────────────────────────────────────
    gs.reputation = clampRep(gs.reputation - 2);

    // ── Update high score ─────────────────────────────────────────────────────
    if (gs.cash > gs.highScore) gs.highScore = gs.cash;

    // ── Summary card ─────────────────────────────────────────────────────────
    const summaryY = 110;
    k.add([
      k.rect(440, 180, { radius: 12 }),
      k.color(25, 25, 50),
      k.pos(VW / 2, summaryY + 90),
      k.anchor("center"),
    ]);

    const rows: [string, string, [number,number,number]][] = [
      ["💰 Cash before rent", `$${cashBefore}`,           [160, 255, 160]],
      ["🏠 Rent paid",        `-$${rentDue}`,             [255, 140,  80]],
      ["💰 Cash remaining",   `$${gs.cash}`,              [120, 220, 120]],
      ["⭐ Reputation",       `${gs.reputation}%`,        [255, 220,  80]],
      ["🏆 Best cash ever",   `$${gs.highScore}`,         [255, 200,  60]],
    ];
    rows.forEach(([label, value, color], i) => {
      k.add([
        k.text(label, { size: 13, font: "sans-serif" }),
        k.color(180, 175, 200),
        k.pos(30, summaryY + 16 + i * 32),
        k.anchor("topleft"),
      ]);
      k.add([
        k.text(value, { size: 13, font: "sans-serif" }),
        k.color(...color),
        k.pos(VW - 30, summaryY + 16 + i * 32),
        k.anchor("topright"),
      ]);
    });

    // ── Stage progress ────────────────────────────────────────────────────────
    const progressY = 310;
    let statusMsg = "";
    let statusColor: [number,number,number] = [200, 200, 220];
    let nextAction: "morning" | "gameover_bankrupt" | "gameover_rep" | "stageup" = "morning";

    if (gs.reputation <= 0) {
      statusMsg   = "😱 Reputation hit 0% — inspectors shut you down!";
      statusColor = [255, 80, 80];
      nextAction  = "gameover_rep";
    } else if (gs.cash <= 0 && cashBefore < rentDue) {
      statusMsg   = "💸 You couldn't afford the rent — bankrupt!";
      statusColor = [255, 80, 80];
      nextAction  = "gameover_bankrupt";
    } else if (stage.target !== null && gs.cash >= stage.target) {
      statusMsg   = `🎉 Stage complete! You hit $${stage.target}!`;
      statusColor = [80, 255, 120];
      nextAction  = "stageup";
    } else {
      const remaining = stage.target !== null ? stage.target - gs.cash : null;
      statusMsg   = remaining !== null
        ? `📈 Need $${remaining} more to reach stage target.`
        : `🌟 Endless mode — keep going!`;
      statusColor = [160, 200, 255];
      nextAction  = "morning";
    }

    k.add([
      k.text(statusMsg, { size: 14, font: "sans-serif", width: 440, align: "center" }),
      k.color(...statusColor),
      k.pos(VW / 2, progressY),
      k.anchor("center"),
    ]);

    // Stage-up banner
    if (nextAction === "stageup" && gs.stageIdx < STAGES.length - 1) {
      const nextStage = STAGES[gs.stageIdx + 1]!;
      k.add([
        k.text(`⬆ Next: ${nextStage.name}`, { size: 15, font: "sans-serif" }),
        k.color(120, 255, 180),
        k.pos(VW / 2, progressY + 30),
        k.anchor("center"),
      ]);
    }

    // ── Continue / Game-over button ───────────────────────────────────────────
    const btnY = 430;
    const isOver = nextAction === "gameover_bankrupt" || nextAction === "gameover_rep";

    const btnColor: [number,number,number] = isOver ? [160, 40, 40] : [60, 120, 200];
    const btnLabel = isOver ? "See Results" : "Next Day →";

    const btn = k.add([
      k.rect(240, 60, { radius: 14 }),
      k.color(...btnColor),
      k.pos(VW / 2, btnY),
      k.anchor("center"),
      k.area(),
    ]);
    k.add([
      k.text(btnLabel, { size: 20, font: "sans-serif" }),
      k.color(255, 255, 255),
      k.pos(VW / 2, btnY),
      k.anchor("center"),
    ]);

    let pulse = 0;
    k.onUpdate(() => {
      pulse += k.dt() * 2;
      const s = 1 + Math.sin(pulse) * 0.03;
      btn.width  = 240 * s;
      btn.height = 60 * s;
    });

    function proceed() {
      if (nextAction === "stageup" && gs.stageIdx < STAGES.length - 1) {
        gs.stageIdx++;
      }
      gs.day++;
      saveState(gs);

      if (nextAction === "gameover_bankrupt") {
        clearSave();
        onGameOver("bankrupt");
      } else if (nextAction === "gameover_rep") {
        clearSave();
        onGameOver("reputation");
      } else {
        onMorning();
      }
    }

    btn.onClick(proceed);
    k.onKeyPress("enter", proceed);
    k.onKeyPress("space", proceed);

    // Attribution
    k.add([
      k.text("freegamestore.online", { size: 10, font: "sans-serif" }),
      k.color(50, 50, 75),
      k.pos(VW / 2, VH - 14),
      k.anchor("center"),
    ]);
  });
}
