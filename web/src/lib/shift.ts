// ── Afternoon Shift Scene ─────────────────────────────────────────────────────
// Real-time timed events: serve customers by tapping/typing codes, catch thieves.

import kaplay from "kaplay";
import {
  GameState,
  CandyCategory,
  GUMMY_TIERS,
  CHOCO_TIERS,
  HARD_TIERS,
  SEC_WINDOWS,
  clampRep,
  effectivePrice,
} from "./state";

type K = ReturnType<typeof kaplay>;

const VW = 480;
const VH = 640;

function customerCount(gs: GameState): number {
  const base = 6 + gs.stageIdx * 2;
  return gs.dailyEvent === "rainy" ? Math.max(1, Math.floor(base / 2)) : base;
}

function thiefChance(gs: GameState): number {
  const base = 0.25;
  return gs.dailyEvent === "thief_spree" ? Math.min(0.8, base * 2) : base;
}

function catName(gs: GameState, cat: CandyCategory): string {
  if (cat === "gummy") return GUMMY_TIERS[gs.gummyTier]?.name ?? "Gummies";
  if (cat === "choco") return CHOCO_TIERS[gs.chocoTier]?.name ?? "Chocolates";
  return HARD_TIERS[gs.hardTier]?.name ?? "Hard Candy";
}

const CODE: Record<CandyCategory, string> = { gummy: "GUM", choco: "CHO", hard: "HAR" };
const CAT_COLORS: Record<CandyCategory, [number, number, number]> = {
  gummy: [255, 100, 180],
  choco: [160, 100,  60],
  hard:  [100, 200, 255],
};

export function registerShiftScene(k: K, gs: GameState, onDone: () => void) {
  k.scene("shift", () => {
    // Background
    k.add([k.rect(VW, VH), k.color(20, 30, 20), k.pos(0, 0), k.fixed()]);

    // Header
    k.add([
      k.text("🛍️ The Shift is Open!", { size: 20, font: "sans-serif" }),
      k.color(255, 220, 80),
      k.pos(VW / 2, 22),
      k.anchor("center"),
    ]);

    const cashLabel = k.add([
      k.text(`💰 $${gs.cash.toFixed(0)}`, { size: 14, font: "sans-serif" }),
      k.color(160, 255, 160),
      k.pos(16, 46),
      k.anchor("left"),
    ]);
    const repLabel = k.add([
      k.text(`⭐ ${gs.reputation}%`, { size: 14, font: "sans-serif" }),
      k.color(255, 220, 120),
      k.pos(VW - 16, 46),
      k.anchor("right"),
    ]);
    const stockLabel = k.add([
      k.text("", { size: 11, font: "sans-serif" }),
      k.color(180, 180, 200),
      k.pos(VW / 2, 66),
      k.anchor("center"),
    ]);

    function refreshStats() {
      cashLabel.text = `💰 $${gs.cash.toFixed(0)}`;
      repLabel.text  = `⭐ ${gs.reputation}%`;
      const gn = catName(gs, "gummy");
      const cn = catName(gs, "choco");
      const hn = catName(gs, "hard");
      stockLabel.text = `${gn}×${gs.stock.gummy}  ${cn}×${gs.stock.choco}  ${hn}×${gs.stock.hard}`;
    }
    refreshStats();

    const progressLabel = k.add([
      k.text("Customers: 0/0", { size: 12, font: "sans-serif" }),
      k.color(160, 160, 180),
      k.pos(VW / 2, 86),
      k.anchor("center"),
    ]);

    // Event display area
    k.add([
      k.rect(440, 200, { radius: 12 }),
      k.color(40, 50, 40),
      k.pos(VW / 2, 200),
      k.anchor("center"),
    ]);
    const eventBg = k.add([
      k.rect(436, 196, { radius: 10 }),
      k.color(40, 50, 40),
      k.pos(VW / 2, 200),
      k.anchor("center"),
    ]);
    const eventIcon  = k.add([k.text("", { size: 40 }), k.pos(VW / 2, 152), k.anchor("center")]);
    const eventLine1 = k.add([
      k.text("", { size: 16, font: "sans-serif", width: 400 }),
      k.color(255, 255, 255),
      k.pos(VW / 2, 198),
      k.anchor("center"),
    ]);
    const eventLine2 = k.add([
      k.text("", { size: 13, font: "sans-serif", width: 400 }),
      k.color(200, 200, 220),
      k.pos(VW / 2, 222),
      k.anchor("center"),
    ]);

    // Timer bar (bg then bar)
    k.add([
      k.rect(380, 14, { radius: 6 }),
      k.color(50, 50, 60),
      k.pos(VW / 2, 252),
      k.anchor("center"),
    ]);
    const timerBar = k.add([
      k.rect(380, 14, { radius: 6 }),
      k.color(80, 220, 80),
      k.pos(VW / 2, 252),
      k.anchor("center"),
    ]);

    // Typing input
    k.add([
      k.rect(280, 52, { radius: 8 }),
      k.color(30, 40, 30),
      k.pos(VW / 2, 296),
      k.anchor("center"),
    ]);
    const inputLabel = k.add([
      k.text("", { size: 22, font: "sans-serif" }),
      k.color(120, 120, 140),
      k.pos(VW / 2, 296),
      k.anchor("center"),
    ]);

    const feedbackLabel = k.add([
      k.text("", { size: 15, font: "sans-serif" }),
      k.color(255, 200, 80),
      k.pos(VW / 2, 334),
      k.anchor("center"),
    ]);

    // Log lines
    const logLines: string[] = [];
    const logObjs: ReturnType<K["add"]>[] = [];
    for (let i = 0; i < 5; i++) {
      logObjs.push(
        k.add([
          k.text("", { size: 11, font: "sans-serif" }),
          k.color(140, 140, 160),
          k.pos(VW / 2, 370 + i * 18),
          k.anchor("center"),
        ]),
      );
    }
    function addLog(msg: string) {
      logLines.unshift(msg);
      if (logLines.length > 5) logLines.pop();
      for (let i = 0; i < logObjs.length; i++) {
        logObjs[i]!.text = logLines[i] ?? "";
      }
    }

    // Category buttons (for touch/click)
    const BTN_Y = 490;
    const btnDefs: { cat: CandyCategory; x: number; label: string }[] = [
      { cat: "gummy", x: VW / 2 - 130, label: "GUM\n[G]" },
      { cat: "choco", x: VW / 2,        label: "CHO\n[C]" },
      { cat: "hard",  x: VW / 2 + 130,  label: "HAR\n[H]" },
    ];
    const catBtns: { cat: CandyCategory; bg: ReturnType<K["add"]> }[] = [];
    for (const def of btnDefs) {
      const bg = k.add([
        k.rect(100, 60, { radius: 8 }),
        k.color(...CAT_COLORS[def.cat]),
        k.pos(def.x, BTN_Y),
        k.anchor("center"),
        k.area(),
      ]);
      k.add([
        k.text(def.label, { size: 13, font: "sans-serif", align: "center" }),
        k.color(255, 255, 255),
        k.pos(def.x, BTN_Y),
        k.anchor("center"),
      ]);
      catBtns.push({ cat: def.cat, bg });
    }

    // STOP button for thieves
    const stopBtn = k.add([
      k.rect(180, 60, { radius: 10 }),
      k.color(220, 60, 60),
      k.pos(VW / 2, BTN_Y),
      k.anchor("center"),
      k.area(),
    ]);
    k.add([
      k.text("STOP\n[Type it!]", { size: 14, font: "sans-serif", align: "center" }),
      k.color(255, 255, 255),
      k.pos(VW / 2, BTN_Y),
      k.anchor("center"),
    ]);

    // Attribution
    k.add([
      k.text("freegamestore.online", { size: 10, font: "sans-serif" }),
      k.color(60, 80, 60),
      k.pos(VW / 2, VH - 14),
      k.anchor("center"),
    ]);

    // ── State machine ─────────────────────────────────────────────────────────
    type EventType = "idle" | "customer" | "thief" | "finished";
    let eventType: EventType = "idle";
    let timeLeft = 0;
    let customerCat: CandyCategory = "gummy";
    let typed = "";
    let shiftDone = false;

    const totalCustomers = customerCount(gs);
    let customersServed = 0;
    let customersTotal  = 0;

    progressLabel.text = `Customers: 0/${totalCustomers}`;

    function setButtonsVisible(type: "customer" | "thief" | "none") {
      for (const b of catBtns) {
        b.bg.hidden = (type !== "customer");
      }
      stopBtn.hidden = (type !== "thief");
    }
    setButtonsVisible("none");

    function clearEventDisplay() {
      eventIcon.text  = "";
      eventLine1.text = "";
      eventLine2.text = "";
      timerBar.width  = 0;
      inputLabel.text = "";
      inputLabel.color = k.rgb(120, 120, 140);
      typed = "";
      setButtonsVisible("none");
      eventBg.color = k.rgb(40, 50, 40);
    }

    function nextEvent() {
      if (shiftDone) return;
      customersTotal++;
      progressLabel.text = `Customers: ${customersServed}/${totalCustomers}`;

      if (customersTotal > totalCustomers) {
        finishShift();
        return;
      }

      if (Math.random() < thiefChance(gs)) {
        startThief();
      } else {
        startCustomer();
      }
    }

    function startCustomer() {
      eventType = "customer";
      const cats: CandyCategory[] = ["gummy", "choco", "hard"];
      customerCat = cats[Math.floor(Math.random() * 3)]!;
      const name     = catName(gs, customerCat);
      const patience = gs.dailyEvent === "flash" ? 2 : 4;
      timeLeft = patience;

      eventBg.color   = k.rgb(30, 60, 80);
      eventIcon.text  = "🧑";
      eventLine1.text = `Customer wants: ${name}`;
      eventLine2.text = `Type: ${CODE[customerCat]}  (or tap button)`;
      inputLabel.text  = "_";
      inputLabel.color = k.rgb(220, 220, 240);
      typed = "";
      setButtonsVisible("customer");
      feedbackLabel.text = "";
    }

    function startThief() {
      eventType = "thief";
      const secLevel = gs.secLevel;

      // AI auto-catch at level 3 (50% chance)
      if (secLevel >= 3 && Math.random() < 0.5) {
        addLog("🤖 AI Camera auto-caught a thief!");
        gs.reputation = clampRep(gs.reputation + 5);
        feedbackLabel.text  = "🤖 AI Camera caught the thief!";
        feedbackLabel.color = k.rgb(80, 255, 120);
        refreshStats();
        k.wait(1.2, nextEvent);
        return;
      }

      const window = SEC_WINDOWS[secLevel] ?? 1.5;
      timeLeft = window;

      eventBg.color   = k.rgb(80, 20, 20);
      eventIcon.text  = "🚨";
      eventLine1.text = "A thief is stealing from the register!";
      eventLine2.text = "Type STOP or tap button NOW!";
      inputLabel.text  = "_";
      inputLabel.color = k.rgb(255, 200, 80);
      typed = "";
      setButtonsVisible("thief");
      feedbackLabel.text = "";
    }

    function resolveCustomer(success: boolean) {
      if (eventType !== "customer") return;
      eventType = "idle";
      clearEventDisplay();

      if (success) {
        const useStock = gs.dailyEvent === "bogo" ? 2 : 1;
        if (gs.stock[customerCat] < useStock) {
          addLog("❌ Out of stock! Customer left angry.");
          gs.reputation       = clampRep(gs.reputation - 5);
          feedbackLabel.text  = "❌ Out of stock!";
          feedbackLabel.color = k.rgb(255, 80, 80);
        } else {
          gs.stock[customerCat] -= useStock;
          const earned = effectivePrice(gs, customerCat);
          gs.cash += earned;
          let repGain = 2;
          if (gs.dailyEvent === "bogo") repGain += 4;
          gs.reputation = clampRep(gs.reputation + repGain);
          customersServed++;
          addLog(`✅ Served! +$${earned}  +${repGain}% rep`);
          feedbackLabel.text  = `✅ +$${earned}`;
          feedbackLabel.color = k.rgb(80, 255, 120);
        }
      } else {
        addLog("⏱ Customer left! -5% rep");
        gs.reputation       = clampRep(gs.reputation - 5);
        feedbackLabel.text  = "⏱ Customer left!";
        feedbackLabel.color = k.rgb(255, 80, 80);
      }
      refreshStats();
      k.wait(0.8, nextEvent);
    }

    function resolveThief(caught: boolean) {
      if (eventType !== "thief") return;
      eventType = "idle";
      clearEventDisplay();

      if (caught) {
        gs.reputation       = clampRep(gs.reputation + 5);
        addLog("🛑 Thief caught! +5% rep");
        feedbackLabel.text  = "🛑 Thief caught!";
        feedbackLabel.color = k.rgb(80, 255, 120);
      } else {
        gs.cash             = Math.max(0, gs.cash - 20);
        gs.reputation       = clampRep(gs.reputation - 10);
        addLog("💸 Thief escaped! -$20 -10% rep");
        feedbackLabel.text  = "💸 Thief escaped! -$20";
        feedbackLabel.color = k.rgb(255, 80, 80);
      }
      refreshStats();
      k.wait(0.8, nextEvent);
    }

    function finishShift() {
      if (shiftDone) return;
      shiftDone = true;
      eventType = "finished";
      clearEventDisplay();
      eventIcon.text  = "🌙";
      eventLine1.text = "Shift Over! Closing up…";
      eventLine2.text = `Served ${customersServed}/${totalCustomers} customers`;
      setButtonsVisible("none");
      k.wait(2, onDone);
    }

    // ── Keyboard input ────────────────────────────────────────────────────────
    k.onCharInput((ch: string) => {
      if (eventType !== "customer" && eventType !== "thief") return;
      typed += ch.toUpperCase();
      inputLabel.text = typed + "_";

      if (eventType === "customer" && typed.length >= 3) {
        if (typed.slice(-3) === CODE[customerCat]) {
          resolveCustomer(true);
        } else if (typed.length >= 5) {
          typed = "";
          inputLabel.text     = "_";
          feedbackLabel.text  = "Wrong code! Try again.";
          feedbackLabel.color = k.rgb(255, 80, 80);
        }
      }
      if (eventType === "thief" && typed.slice(-4) === "STOP") {
        resolveThief(true);
      }
    });

    // Touch / click buttons
    for (const btn of catBtns) {
      btn.bg.onClick(() => {
        if (eventType !== "customer") return;
        if (btn.cat === customerCat) {
          resolveCustomer(true);
        } else {
          feedbackLabel.text  = "Wrong category!";
          feedbackLabel.color = k.rgb(255, 80, 80);
        }
      });
    }
    stopBtn.onClick(() => {
      if (eventType !== "thief") return;
      resolveThief(true);
    });

    // ── Per-frame timer ───────────────────────────────────────────────────────
    k.onUpdate(() => {
      if (eventType !== "customer" && eventType !== "thief") return;
      timeLeft -= k.dt();

      const maxTime =
        eventType === "thief"
          ? (SEC_WINDOWS[gs.secLevel] ?? 1.5)
          : gs.dailyEvent === "flash"
            ? 2
            : 4;
      const frac = Math.max(0, timeLeft / maxTime);
      timerBar.width = 380 * frac;

      if (frac > 0.5)       timerBar.color = k.rgb(80, 220, 80);
      else if (frac > 0.25) timerBar.color = k.rgb(255, 200, 60);
      else                  timerBar.color = k.rgb(255, 80, 80);

      if (timeLeft <= 0) {
        if (eventType === "customer") resolveCustomer(false);
        else if (eventType === "thief") resolveThief(false);
      }
    });

    // Kick off first event after a short delay
    k.wait(1.2, nextEvent);
  });
}
