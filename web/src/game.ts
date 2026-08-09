// ── Candy Shop — Catch falling candies arcade game ───────────────────────────

import kaplay from "kaplay";

const VW = 480;
const VH = 640;
const LS_KEY = "candyshop_highscore";

type K = ReturnType<typeof kaplay>;

// ── Candy definitions ─────────────────────────────────────────────────────────
const CANDIES = [
  { emoji: "🍬", label: "Candy",      points: 1, color: [255, 100, 180] as [number,number,number] },
  { emoji: "🍭", label: "Lollipop",   points: 2, color: [255, 200,  60] as [number,number,number] },
  { emoji: "🍫", label: "Chocolate",  points: 3, color: [160,  90,  40] as [number,number,number] },
  { emoji: "🧁", label: "Cupcake",    points: 5, color: [200, 120, 255] as [number,number,number] },
  { emoji: "⭐", label: "Star",       points: 10, color: [255, 230,  50] as [number,number,number] },
  { emoji: "💀", label: "Skull",      points: -8, color: [180,  60,  60] as [number,number,number] },
];

function loadHighScore(): number {
  try { return parseInt(localStorage.getItem(LS_KEY) ?? "0", 10) || 0; } catch { return 0; }
}
function saveHighScore(n: number) {
  try { localStorage.setItem(LS_KEY, String(n)); } catch { /* ignore */ }
}

export function startGame(
  canvas: HTMLCanvasElement,
  onScore: (n: number) => void,
): () => void {
  const k = kaplay({
    canvas,
    width: VW,
    height: VH,
    letterbox: true,
    background: [18, 10, 30],
    global: false,
    forceCanvas: true,
    pixelDensity: Math.min(window.devicePixelRatio || 1, 2),
  });

  const highScore = loadHighScore();
  onScore(highScore);

  registerMenuScene(k, onScore);
  registerPlayScene(k, onScore);
  registerOverScene(k, onScore);

  k.go("menu");

  return () => k.quit();
}

// ── Menu scene ────────────────────────────────────────────────────────────────
function registerMenuScene(k: K, _onScore: (n: number) => void) {
  k.scene("menu", () => {
    // Gradient-ish background
    k.add([k.rect(VW, VH), k.color(18, 10, 30), k.pos(0, 0), k.fixed()]);

    // Floating candy decorations
    const decos = ["🍬", "🍭", "🍫", "🧁", "⭐", "🍬", "🍭"];
    decos.forEach((emoji, i) => {
      const x = 40 + (i * 68) % (VW - 40);
      const startY = -30 - i * 40;
      const speed  = 40 + (i * 17) % 30;
      const obj = k.add([
        k.text(emoji, { size: 28 }),
        k.pos(x, startY),
        k.anchor("center"),
      ]);
      k.onUpdate(() => {
        obj.pos.y += speed * k.dt();
        if (obj.pos.y > VH + 30) obj.pos.y = -30;
      });
    });

    // Title
    k.add([
      k.text("🍭 Candy Shop", { size: 44, font: "sans-serif" }),
      k.color(255, 200, 80),
      k.pos(VW / 2, 140),
      k.anchor("center"),
    ]);
    k.add([
      k.text("Catch the sweets, dodge the skulls!", { size: 16, font: "sans-serif" }),
      k.color(200, 180, 220),
      k.pos(VW / 2, 196),
      k.anchor("center"),
    ]);

    // High score
    const hs = loadHighScore();
    if (hs > 0) {
      k.add([
        k.text(`🏆 Best: ${hs}`, { size: 18, font: "sans-serif" }),
        k.color(255, 220, 60),
        k.pos(VW / 2, 240),
        k.anchor("center"),
      ]);
    }

    // Scoring legend
    const legendY = 290;
    k.add([
      k.text("Points per catch:", { size: 13, font: "sans-serif" }),
      k.color(160, 150, 180),
      k.pos(VW / 2, legendY),
      k.anchor("center"),
    ]);
    const legend = [
      { emoji: "🍬", pts: "+1" },
      { emoji: "🍭", pts: "+2" },
      { emoji: "🍫", pts: "+3" },
      { emoji: "🧁", pts: "+5" },
      { emoji: "⭐", pts: "+10" },
      { emoji: "💀", pts: "−8" },
    ];
    legend.forEach((item, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = VW / 2 - 110 + col * 110;
      const y = legendY + 28 + row * 36;
      k.add([
        k.text(`${item.emoji} ${item.pts}`, { size: 16, font: "sans-serif" }),
        k.color(220, 210, 240),
        k.pos(x, y),
        k.anchor("center"),
      ]);
    });

    // Play button
    const playBtn = k.add([
      k.rect(220, 60, { radius: 14 }),
      k.color(200, 80, 200),
      k.pos(VW / 2, 440),
      k.anchor("center"),
      k.area(),
    ]);
    k.add([
      k.text("▶  Play", { size: 24, font: "sans-serif" }),
      k.color(255, 255, 255),
      k.pos(VW / 2, 440),
      k.anchor("center"),
    ]);

    // Pulse animation
    let pulse = 0;
    k.onUpdate(() => {
      pulse += k.dt() * 2;
      const s = 1 + Math.sin(pulse) * 0.04;
      playBtn.width  = 220 * s;
      playBtn.height = 60 * s;
    });

    playBtn.onClick(() => k.go("play"));
    k.onKeyPress("space",  () => k.go("play"));
    k.onKeyPress("enter",  () => k.go("play"));

    // Controls hint
    k.add([
      k.text("← → Arrow Keys  or  Drag to move basket", { size: 12, font: "sans-serif" }),
      k.color(120, 110, 140),
      k.pos(VW / 2, 510),
      k.anchor("center"),
    ]);

    k.add([
      k.text("freegamestore.online", { size: 11, font: "sans-serif" }),
      k.color(80, 70, 100),
      k.pos(VW / 2, VH - 16),
      k.anchor("center"),
    ]);
  });
}

// ── Play scene ────────────────────────────────────────────────────────────────
function registerPlayScene(k: K, onScore: (n: number) => void) {
  k.scene("play", () => {
    k.add([k.rect(VW, VH), k.color(18, 10, 30), k.pos(0, 0), k.fixed()]);

    // ── State ─────────────────────────────────────────────────────────────────
    let score    = 0;
    let lives    = 3;
    let combo    = 0;
    let level    = 1;
    let elapsed  = 0;
    let spawnTimer = 0;
    let gameOver = false;

    // ── Basket ────────────────────────────────────────────────────────────────
    const BASKET_W = 90;
    const BASKET_H = 28;
    const BASKET_Y = VH - 60;

    const basket = k.add([
      k.rect(BASKET_W, BASKET_H, { radius: 8 }),
      k.color(255, 180, 60),
      k.pos(VW / 2, BASKET_Y),
      k.anchor("center"),
      k.area(),
      "basket",
    ]);
    // Basket rim decoration
    const rim = k.add([
      k.rect(BASKET_W + 10, 8, { radius: 4 }),
      k.color(255, 140, 30),
      k.pos(VW / 2, BASKET_Y - BASKET_H / 2 + 2),
      k.anchor("center"),
    ]);

    // ── HUD ───────────────────────────────────────────────────────────────────
    const scoreTxt = k.add([
      k.text("0", { size: 28, font: "sans-serif" }),
      k.color(255, 230, 80),
      k.pos(VW / 2, 22),
      k.anchor("center"),
    ]);
    const livesTxt = k.add([
      k.text("❤️❤️❤️", { size: 18, font: "sans-serif" }),
      k.color(255, 100, 120),
      k.pos(14, 14),
      k.anchor("topleft"),
    ]);
    const levelTxt = k.add([
      k.text("Lv 1", { size: 14, font: "sans-serif" }),
      k.color(180, 160, 220),
      k.pos(VW - 14, 14),
      k.anchor("topright"),
    ]);
    const comboTxt = k.add([
      k.text("", { size: 16, font: "sans-serif" }),
      k.color(255, 200, 60),
      k.pos(VW / 2, 52),
      k.anchor("center"),
    ]);

    function updateHud() {
      scoreTxt.text = String(score);
      livesTxt.text = "❤️".repeat(Math.max(0, lives));
      levelTxt.text = `Lv ${level}`;
      comboTxt.text = combo >= 3 ? `🔥 x${combo} Combo!` : "";
    }
    updateHud();

    // ── Basket movement ───────────────────────────────────────────────────────
    const BASKET_SPEED = 380;
    let dragOffsetX = 0;
    let isDragging  = false;

    k.onMousePress(() => {
      isDragging  = true;
      dragOffsetX = basket.pos.x - k.mousePos().x;
    });
    k.onMouseRelease(() => { isDragging = false; });
    k.onTouchStart((touches) => {
      const t = touches[0];
      if (t) { isDragging = true; dragOffsetX = basket.pos.x - t.pos.x; }
    });
    k.onTouchEnd(() => { isDragging = false; });

    k.onUpdate(() => {
      if (gameOver) return;

      // Keyboard
      if (k.isKeyDown("left")  || k.isKeyDown("a")) basket.pos.x -= BASKET_SPEED * k.dt();
      if (k.isKeyDown("right") || k.isKeyDown("d")) basket.pos.x += BASKET_SPEED * k.dt();

      // Mouse/touch drag
      if (isDragging) {
        const mx = k.mousePos().x;
        basket.pos.x = mx + dragOffsetX;
      }

      // Clamp basket
      const hw = BASKET_W / 2;
      basket.pos.x = Math.max(hw, Math.min(VW - hw, basket.pos.x));
      rim.pos.x    = basket.pos.x;
    });

    // ── Candy spawning ────────────────────────────────────────────────────────
    function spawnInterval(): number {
      return Math.max(0.45, 1.4 - level * 0.08);
    }
    function fallSpeed(): number {
      return 120 + level * 28;
    }
    function skullChance(): number {
      return Math.min(0.28, 0.06 + level * 0.018);
    }

    function spawnCandy() {
      // Pick candy type
      let def;
      if (Math.random() < skullChance()) {
        def = CANDIES[5]!; // skull
      } else {
        // Weighted pick: common candies more likely at low levels
        const pool = CANDIES.slice(0, 5);
        const weights = [40, 25, 18, 10, 7];
        let total = 0;
        for (const w of weights) total += w;
        let r = Math.random() * total;
        let idx = 0;
        for (let i = 0; i < weights.length; i++) {
          r -= weights[i]!;
          if (r <= 0) { idx = i; break; }
        }
        def = pool[idx]!;
      }

      const x = 30 + Math.random() * (VW - 60);
      const size = 30 + (def.points > 3 ? 4 : 0);

      // Wobble state
      let wobble = Math.random() * Math.PI * 2;
      const wobbleAmp = 18 + Math.random() * 18;
      const wobbleFreq = 1.5 + Math.random() * 1.5;
      const baseX = x;

      const candy = k.add([
        k.text(def.emoji, { size: size }),
        k.pos(x, -30),
        k.anchor("center"),
        k.area({ shape: new k.Rect(k.vec2(-size / 2, -size / 2), size, size) }),
        "candy",
        {
          points: def.points,
          speed: fallSpeed() + Math.random() * 30,
          wobble,
          wobbleAmp,
          wobbleFreq,
          baseX,
          label: def.label,
        },
      ]);

      candy.onUpdate(() => {
        candy.pos.y += candy.speed * k.dt();
        candy.wobble += candy.wobbleFreq * k.dt();
        candy.pos.x = candy.baseX + Math.sin(candy.wobble) * candy.wobbleAmp;
        candy.pos.x = Math.max(16, Math.min(VW - 16, candy.pos.x));

        // Missed — lost a life
        if (candy.pos.y > VH + 40) {
          if (candy.points > 0) {
            lives--;
            combo = 0;
            updateHud();
            showFloating("💔 Miss!", candy.pos.x, VH - 80, [255, 80, 80]);
            if (lives <= 0) endGame();
          }
          k.destroy(candy);
        }
      });

      candy.onCollide("basket", () => {
        const pts = candy.points;
        if (pts > 0) {
          combo++;
          const multiplier = combo >= 5 ? 3 : combo >= 3 ? 2 : 1;
          const earned = pts * multiplier;
          score = Math.max(0, score + earned);
          const label = multiplier > 1 ? `+${earned} ×${multiplier}!` : `+${earned}`;
          showFloating(label, candy.pos.x, candy.pos.y - 20, [120, 255, 120]);
        } else {
          // Skull hit
          lives--;
          combo = 0;
          score = Math.max(0, score + pts); // pts is negative
          showFloating(`${pts}`, candy.pos.x, candy.pos.y - 20, [255, 80, 80]);
          if (lives <= 0) endGame();
        }
        updateHud();
        onScore(Math.max(score, loadHighScore()));
        k.destroy(candy);
      });
    }

    // ── Floating score text ───────────────────────────────────────────────────
    function showFloating(msg: string, x: number, y: number, color: [number,number,number]) {
      const obj = k.add([
        k.text(msg, { size: 18, font: "sans-serif" }),
        k.color(...color),
        k.pos(x, y),
        k.anchor("center"),
        k.opacity(1),
      ]);
      let t = 0;
      obj.onUpdate(() => {
        t += k.dt();
        obj.pos.y -= 50 * k.dt();
        obj.opacity = Math.max(0, 1 - t / 0.9);
        if (t > 0.9) k.destroy(obj);
      });
    }

    // ── Main update loop ──────────────────────────────────────────────────────
    k.onUpdate(() => {
      if (gameOver) return;
      elapsed    += k.dt();
      spawnTimer += k.dt();

      // Level up every 15 seconds
      const newLevel = 1 + Math.floor(elapsed / 15);
      if (newLevel > level) {
        level = newLevel;
        updateHud();
        showFloating(`⬆ Level ${level}!`, VW / 2, VH / 2, [255, 220, 80]);
      }

      if (spawnTimer >= spawnInterval()) {
        spawnTimer = 0;
        spawnCandy();
        // Occasionally spawn a second candy at higher levels
        if (level >= 4 && Math.random() < 0.35) {
          k.wait(0.18, spawnCandy);
        }
      }
    });

    // ── Game over ─────────────────────────────────────────────────────────────
    function endGame() {
      if (gameOver) return;
      gameOver = true;
      const hs = loadHighScore();
      const newHs = Math.max(score, hs);
      if (newHs > hs) saveHighScore(newHs);
      onScore(newHs);
      k.wait(0.5, () => k.go("over", score, newHs));
    }

    k.add([
      k.text("freegamestore.online", { size: 10, font: "sans-serif" }),
      k.color(60, 50, 80),
      k.pos(VW / 2, VH - 10),
      k.anchor("center"),
    ]);
  });
}

// ── Game Over scene ───────────────────────────────────────────────────────────
function registerOverScene(k: K, onScore: (n: number) => void) {
  k.scene("over", (score: number, highScore: number) => {
    k.add([k.rect(VW, VH), k.color(14, 8, 24), k.pos(0, 0), k.fixed()]);

    const isNewRecord = score >= highScore && score > 0;

    k.add([
      k.text(isNewRecord ? "🏆 New Record!" : "Game Over!", { size: 36, font: "sans-serif" }),
      k.color(isNewRecord ? 255 : 220, isNewRecord ? 220 : 100, isNewRecord ? 60 : 80),
      k.pos(VW / 2, 120),
      k.anchor("center"),
    ]);

    k.add([
      k.text(`Score: ${score}`, { size: 28, font: "sans-serif" }),
      k.color(255, 230, 80),
      k.pos(VW / 2, 180),
      k.anchor("center"),
    ]);

    k.add([
      k.text(`Best:  ${highScore}`, { size: 20, font: "sans-serif" }),
      k.color(180, 160, 220),
      k.pos(VW / 2, 220),
      k.anchor("center"),
    ]);

    // Tip
    const tips = [
      "Tip: Star ⭐ gives 10 points — never miss it!",
      "Tip: Build a combo for 2× or 3× multiplier!",
      "Tip: Skulls 💀 cost 8 points — dodge them!",
      "Tip: Cupcakes 🧁 are worth 5 points each.",
      "Tip: Speed increases every 15 seconds!",
    ];
    const tip = tips[Math.floor(Math.random() * tips.length)]!;
    k.add([
      k.text(tip, { size: 13, font: "sans-serif", width: 380, align: "center" }),
      k.color(140, 130, 160),
      k.pos(VW / 2, 275),
      k.anchor("center"),
    ]);

    // Play again button
    const btn = k.add([
      k.rect(240, 62, { radius: 14 }),
      k.color(200, 80, 200),
      k.pos(VW / 2, 360),
      k.anchor("center"),
      k.area(),
    ]);
    k.add([
      k.text("▶  Play Again", { size: 22, font: "sans-serif" }),
      k.color(255, 255, 255),
      k.pos(VW / 2, 360),
      k.anchor("center"),
    ]);

    // Menu button
    const menuBtn = k.add([
      k.rect(200, 50, { radius: 12 }),
      k.color(60, 50, 90),
      k.pos(VW / 2, 440),
      k.anchor("center"),
      k.area(),
    ]);
    k.add([
      k.text("Main Menu", { size: 18, font: "sans-serif" }),
      k.color(200, 190, 220),
      k.pos(VW / 2, 440),
      k.anchor("center"),
    ]);

    // Pulse
    let pulse = 0;
    k.onUpdate(() => {
      pulse += k.dt() * 2;
      const s = 1 + Math.sin(pulse) * 0.04;
      btn.width  = 240 * s;
      btn.height = 62 * s;
    });

    btn.onClick(() => k.go("play"));
    menuBtn.onClick(() => k.go("menu"));
    k.onKeyPress("space", () => k.go("play"));
    k.onKeyPress("enter", () => k.go("play"));
    k.onKeyPress("escape", () => k.go("menu"));

    onScore(highScore);

    k.add([
      k.text("freegamestore.online", { size: 11, font: "sans-serif" }),
      k.color(80, 70, 100),
      k.pos(VW / 2, VH - 16),
      k.anchor("center"),
    ]);
  });
}
