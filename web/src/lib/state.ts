// ── Shared game state ────────────────────────────────────────────────────────

export type CandyCategory = "gummy" | "choco" | "hard";

export interface CandyTier {
  name: string;
  price: number;
}

export const GUMMY_TIERS: CandyTier[] = [
  { name: "Sour Worms",    price: 5  },
  { name: "Neon Bears",    price: 15 },
  { name: "Galaxy Rings",  price: 40 },
];
export const CHOCO_TIERS: CandyTier[] = [
  { name: "Milk Buttons",   price: 5  },
  { name: "Fudge Cubes",    price: 15 },
  { name: "Gold Choc Bars", price: 40 },
];
export const HARD_TIERS: CandyTier[] = [
  { name: "Mint Drops",     price: 5  },
  { name: "Lemon Discs",    price: 15 },
  { name: "Crystal Rocks",  price: 40 },
];

export const UPGRADE_COSTS: Record<CandyCategory, [number, number]> = {
  gummy: [50, 200],
  choco: [60, 250],
  hard:  [45, 180],
};

export type DailyEvent = "normal" | "flash" | "bogo" | "rainy" | "thief_spree";

export const EVENT_LABELS: Record<DailyEvent, string> = {
  normal:      "Normal Day",
  flash:       "⚡ Flash Sale Day",
  bogo:        "🎁 BOGO Deal",
  rainy:       "🌧️ Rainy Day",
  thief_spree: "🚨 Thief Spree",
};

export const EVENT_DESC: Record<DailyEvent, string> = {
  normal:      "No special modifiers today.",
  flash:       "Prices DOUBLED — but customers leave in 2 s!",
  bogo:        "Each order uses 2 stock but gives +4% rep bonus!",
  rainy:       "Half as many customers today.",
  thief_spree: "Thieves are twice as likely to strike!",
};

export interface Stage {
  name: string;
  rent: number;
  target: number | null;
}

export const STAGES: Stage[] = [
  { name: "Sidewalk Candy Cart",   rent:   5, target:  100 },
  { name: "Shopping Mall Kiosk",   rent:  20, target:  500 },
  { name: "High Street Boutique",  rent:  75, target: 1500 },
  { name: "Confectionery Empire",  rent: 250, target: null },
];

export interface GameState {
  cash: number;
  reputation: number;
  day: number;
  stageIdx: number;
  gummyTier: number;
  chocoTier: number;
  hardTier: number;
  stock: Record<CandyCategory, number>;
  secLevel: number;
  dailyEvent: DailyEvent;
  highScore: number;
}

export function makeInitialState(): GameState {
  const saved = localStorage.getItem("candyshop_save");
  if (saved) {
    try { return JSON.parse(saved) as GameState; } catch { /* fall through */ }
  }
  const hs = loadHighScore();
  return {
    cash: 30,
    reputation: 50,
    day: 1,
    stageIdx: 0,
    gummyTier: 0,
    chocoTier: 0,
    hardTier: 0,
    stock: { gummy: 5, choco: 5, hard: 5 },
    secLevel: 0,
    dailyEvent: "normal",
    highScore: hs,
  };
}

export function saveState(gs: GameState) {
  localStorage.setItem("candyshop_save", JSON.stringify(gs));
}

export function clearSave() {
  localStorage.removeItem("candyshop_save");
}

function loadHighScore(): number {
  try { return parseInt(localStorage.getItem("candyshop_hs") ?? "0", 10) || 0; } catch { return 0; }
}

export function saveHighScore(n: number) {
  try { localStorage.setItem("candyshop_hs", String(n)); } catch { /* ignore */ }
}

export const SEC_COSTS = [30, 80, 200];
export const SEC_NAMES = ["No Cameras", "Basic Cameras", "HD CCTV", "AI Smart Tracking"];
export const SEC_WINDOWS = [1.5, 3, 4.5, 6];

export function currentTier(gs: GameState, cat: CandyCategory): CandyTier {
  if (cat === "gummy") return GUMMY_TIERS[gs.gummyTier]!;
  if (cat === "choco") return CHOCO_TIERS[gs.chocoTier]!;
  return HARD_TIERS[gs.hardTier]!;
}

export function effectivePrice(gs: GameState, cat: CandyCategory): number {
  const base = currentTier(gs, cat).price;
  return gs.dailyEvent === "flash" ? base * 2 : base;
}

export function clampRep(r: number) { return Math.max(0, Math.min(100, r)); }
