import { GameShell, GameTopbar } from "@freegamestore/games";
import { useEffect, useRef, useState } from "react";
import { startGame } from "./game";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [highScore, setHighScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let stop: (() => void) | undefined;
    try {
      stop = startGame(canvas, setHighScore);
    } catch (e) {
      setError(String(e));
    }
    return () => { try { stop?.(); } catch { /* ignore */ } };
  }, []);

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Candy Shop Tycoon"
          score={highScore}
        />
      }
    >
      {error ? (
        <div className="flex items-center justify-center w-full h-full text-red-400 font-sans p-4 text-center">
          <div>
            <p className="text-lg font-bold mb-2">Failed to start game</p>
            <p className="text-sm opacity-70">{error}</p>
          </div>
        </div>
      ) : (
        <canvas ref={canvasRef} className="w-full h-full block touch-none" />
      )}
    </GameShell>
  );
}
