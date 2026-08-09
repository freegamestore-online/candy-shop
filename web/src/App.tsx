import { GameShell, GameTopbar } from "@freegamestore/games";
import { useEffect, useRef, useState } from "react";
import { startGame } from "./game";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // onScore receives the running high-score cash value from the game
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stop = startGame(canvas, setHighScore);
    return stop;
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
      <canvas ref={canvasRef} className="w-full h-full block touch-none" />
    </GameShell>
  );
}
