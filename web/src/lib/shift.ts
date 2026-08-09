// ── Afternoon Shift Scene ─────────────────────────────────────────────────────
// Real-time timed events: serve customers by typing codes, catch thieves by
// typing STOP.

import kaplay from "kaplay";
import {
  GameState, CandyCategory,
  GUMMY_TIERS, CHOCO_TIERS, HARD_TIERS,
  SEC_WINDOWS, clampRep, effectivePrice,
} from "./state";

type K = ReturnType<typeof kaplay>;

const VW = 480, VH = 640;

// How many customers per shift (base)
function customerCount(gs: GameState): number {
  const base = 6 + gs.stageIdx * 2;
  return gs.dailyEvent === "rainy" ? Math.floor(base / 2) : base;
}

// Thief probability per "slot" (after each customer or random gap)
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
const CAT_COLORS: Record<CandyCategory, [number,number,number]> = {
  gummy: [255, 100, 180],
  choco: [160, 100, 60],
  hard:  [100, 200, 255],
};

export function registerShiftScene(k: K, gs: GameState, onDone: () => void) {
  k.scene("shift", () => {
    // ── Background ────────────────────────────────────────────────────────────
    k.add([k.rect(VW, VH), k.color(20, 30, 20), k.pos(0, 0), k.fixed()]);

    // ── Header ────────────────────────────────────────────────────────────────
    k.add([
      k.text("🛍️ The Shift is Open!", { size: 20, font: "sans-serif" }),
      k.color(255, 220, 80), k.pos(VW / 2, 22), k.anchor("center"),
    ]);

    // Dynamic stats (updated each frame)
    const cashLabel = k.add([
      k.text(`💰 $${gs.cash.toFixed(0)}`, { size: 14, font: "sans-serif" }),
      k.color(160, 255, 160), k.pos(16, 46), k.anchor("left"),
    ]);
    const repLabel = k.add([
      k.text(`⭐ ${gs.reputation}%`, { size: 14, font: "sans-serif" }),
      k.color(255, 220, 120), k.pos(VW - 16, 46), k.anchor("right"),
    ]);

    // Stock bar
    const stockLabel = k.add([
      k.text("", { size: 11, font: "sans-serif" }),
      k.color(180, 180, 200), k.pos(VW / 2, 66), k.anchor("center"),
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

    // ── Event area (customer / thief) ─────────────────────────────────────────
    const eventBg = k.add([k.rect(440, 200, { radius: 12 }), k.color(40, 50, 40), k.pos(VW / 2, 200), k.anchor("center")]);
    const eventIcon = k.add([k.text("", { size: 40 }), k.pos(VW / 2, 155), k.anchor("center")]);
    const eventLine1 = k.add([k.text("", { size: 16, font: "sans-serif", width: 400 }), k.color(255, 255, 255), k.pos(VW / 2, 200), k.anchor("center")]);
    const eventLine2 = k.add([k.text("", { size: 13, font: "sans-serif", width: 400 }), k.color(200, 200, 220), k.pos(VW / 2, 225), k.anchor("center")]);
    const timerBg   = k.add([k.rect(380, 14, { radius: 6 }), k.color(50, 50, 60), k.pos(VW / 2, 255), k.anchor("center")]);
    const timerBar  = k.add([k.rect(380, 14, { radius: 6 }), k.color(80, 220, 80), k.pos(VW / 2, 255), k.anchor("center")]);

    void timerBg; // used for visual bg only

    // ── Typing input display ───────────────────────────────────────────────────
    const inputBg = k.add([k.rect(280, 52, { radius: 8 }), k.color(30, 40, 30), k.pos(VW / 2, 300), k.anchor("center")]);
    void inputBg;
    const inputLabel = k.add([k.text("Type here…", { size: 22, font: "sans-serif" }), k.color(120, 120, 140), k.pos(VW / 2, 300), k.anchor("center")]);

    // ── Feedback ──────────────────────────────────────────────────────────────
    const feedbackLabel = k.add([k.text("", { size: 15, font: "sans-serif" }), k.color(255, 200, 80), k.pos(VW / 2, 340), k.anchor("center")]);

    // ── Log ───────────────────────────────────────────────────────────────────
    const logLines: string[] = [];
    const logObjs: ReturnType<K["add"]>[] = [];
    for (let i = 0; i < 5; i++) {
      logObjs.push(k.add([k.text("", { size: 11, font: "sans-serif" }), k.color(140, 140, 160), k.pos(VW / 2, 380 + i * 18), k.anchor("center")]));
    }
    function addLog(msg: string) {
      logLines.unshift(msg);
      if (logLines.length > 5) logLines.pop();
      for (let i = 0; i < logObjs.length; i++) {
        logObjs[i]!.text = logLines[i] ?? "";
      }
    }

    // ── Touch category buttons (shown during customer event) ───────────────────
    const BTN_Y = 490;
    const btnDefs: { cat: CandyCategory; x: number; label: string }[] = [
      { cat: "gummy", x: VW / 2 - 130, label: "GUM\n[G]" },
      { cat: "choco", x: VW / 2,        label: "CHO\n[C]" },
      { cat: "hard",  x: VW / 2 + 130,  label: "HAR\n[H]" },
    ];
    const catBtns: { cat: CandyCategory; bg: ReturnType<K["add"]>; visible: boolean }[] = [];
    for (const def of btnDefs) {
      const bg = k.add([
        k.rect(100, 60, { radius: 8 }),
        k.color(...CAT_COLORS[def.cat]),
        k.pos(def.x, BTN_Y),
        k.anchor("center"),
        k.area(),
        { hidden: true },
      ]);
      k.add([
        k.text(def.label, { size: 13, font: "sans-serif", align: "center" }),
        k.color(255, 255, 255), k.pos(def.x, BTN_Y), k.anchor("center"),
      ]);
      catBtns.push({ cat: def.cat, bg, visible: false });
    }

    // STOP button for thieves
    const stopBtn = k.add([
      k.rect(180, 60, { radius: 10 }),
      k.color(220, 60, 60),
      k.pos(VW / 2, BTN_Y),
      k.anchor("center"),
      k.area(),
      { hidden: true },
    ]);
    k.add([k.text("STOP\n[Type it!]", { size: 14, font: "sans-serif", align: "center" }), k.color(255, 255, 255), k.pos(VW / 2, BTN_Y), k.anchor("center")]);

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

    // Progress label
    const progressLabel = k.add([
      k.text(`Customers: 0/${totalCustomers}`, { size: 12, font: "sans-serif" }),
      k.color(160, 160, 180), k.pos(VW / 2, 90), k.anchor("center"),
    ]);

    function setVisible(type: "customer" | "thief" | "none") {
      for (const b of catBtns) b.bg.hidden = (type !== "customer");
      stopBtn.hidden = (type !== "thief");
    }
    setVisible("none");

    function clearEvent() {
      eventIcon.text = "";
      eventLine1.text = "";
      eventLine2.text = "";
      timerBar.width = 0;
      inputLabel.text = "";
      inputLabel.color = k.rgb(120, 120, 140);
      typed = "";
      setVisible("none");
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

      // Thief or customer?
      if (Math.random() < thiefChance(gs)) {
        startThief();
      } else {
        startCustomer();
      }
    }

    function startCustomer() {
      eventType = "customer";
      // Pick a random category
      const cats: CandyCategory[] = ["gummy", "choco", "hard"];
      customerCat = cats[Math.floor(Math.random() * 3)]!;
      const name = catName(gs, customerCat);
      const patience = gs.dailyEvent === "flash" ? 2 : 4;
      timeLeft = patience;

      eventBg.color = k.rgb(30, 60, 80);
      eventIcon.text = "🧑";
      eventLine1.text = `Customer wants: ${name}`;
      eventLine2.text = `Type: ${CODE[customerCat]}  (or tap button)`;
      inputLabel.text = "_";
      inputLabel.color = k.rgb(220, 220, 240);
      typed = "";
      setVisible("customer");
      feedbackLabel.text = "";
    }

    function startThief() {
      eventType = "thief";
      const secLevel = gs.secLevel;

      // AI auto-catch at level 3 (50% chance)
      if (secLevel >= 3 && Math.random() < 0.5) {
        addLog("🤖 AI Camera auto-caught a thief!");
        gs.reputation = clampRep(gs.reputation + 5);
        feedbackLabel.text = "🤖 AI Camera caught the thief!";
        feedbackLabel.color = k.rgb(80, 255, 120);
        refreshStats();
        k.wait(1.2, nextEvent);
        return;
      }

      const window = SEC_WINDOWS[secLevel] ?? 1.5;
      timeLeft = window;

      eventBg.color = k.rgb(80, 20, 20);
      eventIcon.text = "🚨";
      eventLine1.text = "A thief is stealing from the register!";
      eventLine2.text = "Type STOP or tap button NOW!";
      inputLabel.text = "_";
      inputLabel.color = k.rgb(255, 200, 80);
      typed = "";
      setVisible("thief");
      feedbackLabel.text = "";
    }

    function resolveCustomer(success: boolean) {
      if (eventType !== "customer") return;
      eventType = "idle";
      clearEvent();
      if (success) {
        const useStock = gs.dailyEvent === "bogo" ? 2 : 1;
        if (gs.stock[customerCat] < useStock) {
          // Out of stock
          addLog(`❌ Out of stock! Customer left angry.`);
          gs.reputation = clampRep(gs.reputation - 5);
          feedbackLabel.text = "❌ Out of stock!";
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
          feedbackLabel.text = `✅ +$${earned}`;
          feedbackLabel.color = k.rgb(80, 255, 120);
        }
      } else {
        addLog(`⏱ Customer left! -5% rep`);
        gs.reputation = clampRep(gs.reputation - 5);
        feedbackLabel.text = "⏱ Customer left!";
        feedbackLabel.color = k.rgb(255, 80, 80);
      }
      refreshStats();
      k.wait(0.8, nextEvent);
    }

    function resolveThief(caught: boolean) {
      if (eventType !== "thief") return;
      eventType = "idle";
      clearEvent();
      if (caught) {
        gs.reputation = clampRep(gs.reputation + 5);
        addLog("🛑 Thief caught! +5% rep");
        feedbackLabel.text = "🛑 Thief caught!";
        feedbackLabel.color = k.rgb(80, 255, 120);
      } else {
        gs.cash = Math.max(0, gs.cash - 20);
        gs.reputation = clampRep(gs.reputation - 10);
        addLog("💸 Thief escaped! -$20 -10% rep");
        feedbackLabel.text = "💸 Thief escaped! -$20";
        feedbackLabel.color = k.rgb(255, 80, 80);
      }
      refreshStats();
      k.wait(0.8, nextEvent);
    }

    function finishShift() {
      if (shiftDone) return;
      shiftDone = true;
      eventType = "finished";
      clearEvent();
      eventIcon.text = "🌙";
      eventLine1.text = "Shift Over! Closing up…";
      eventLine2.text = `Served ${customersServed}/${totalCustomers} customers`;
      setVisible("none");
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
        } else if (typed.length >= 4) {
          // Wrong code entered
          typed = "";
          inputLabel.text = "_";
          feedbackLabel.text = "Wrong code!";
          feedbackLabel.color = k.rgb(255, 80, 80);
        }
      }
      if (eventType === "thief" && typed.slice(-4) === "STOP") {
        resolveThief(true);
      }
    });

    // Touch buttons for categories
    for (const btn of catBtns) {
      btn.bg.onClick(() => {
        if (eventType !== "customer") return;
        if (btn.cat === customerCat) {
          resolveCustomer(true);
        } else {
          feedbackLabel.text = "Wrong category!";
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
      const maxTime = eventType === "thief"
        ? (SEC_WINDOWS[gs.secLevel] ?? 1.5)
        : (gs.dailyEvent === "flash" ? 2 : 4);
      const frac = Math.max(0, timeLeft / maxTime);
      timerBar.width = 380 * frac;
      if (frac > 0.5) timerBar.color = k.rgb(80, 220, 80);
      else if (frac > 0.25) timerBar.color = k.rgb(255, 200, 60);
      else timerBar.color = k.rgb(255, 80, 80);

      if (timeLeft <= 0) {
        if (eventType === "customer") resolveCustomer(false);
        else if (eventType === "thief") resolveThief(false);
      }
    });

    // Kick off first event after a short delay
    k.wait(1.2, nextEvent);
  });
}
