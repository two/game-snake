
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameStatus, Direction, Point, GameState, AIResponse } from './types';
import { GRID_SIZE, INITIAL_SPEED, MIN_SPEED, SPEED_INCREMENT, DIRECTIONS } from './constants';
import { getGameCommentary } from './services/geminiService';

const App: React.FC = () => {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>(Direction.UP);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [commentary, setCommentary] = useState("Welcome, initiate. Ready to slither?");
  const [theme, setTheme] = useState("Classic Neon");
  const [loadingAI, setLoadingAI] = useState(false);

  const gameLoopRef = useRef<number | null>(null);
  const lastScoreRef = useRef(0);

  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      if (!currentSnake.some(segment => segment.x === newFood!.x && segment.y === newFood!.y)) {
        break;
      }
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
    setFood(generateFood([{ x: 10, y: 10 }]));
    setDirection(Direction.UP);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setStatus(GameStatus.PLAYING);
    setCommentary("Let the hunt begin!");
    lastScoreRef.current = 0;
  };

  const handleGameOver = useCallback(async () => {
    setStatus(GameStatus.GAME_OVER);
    if (score > highScore) setHighScore(score);
    
    setLoadingAI(true);
    const aiResp = await getGameCommentary(score, "GAME_OVER", [commentary]);
    setCommentary(aiResp.commentary);
    setLoadingAI(false);
  }, [score, highScore, commentary]);

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const head = prevSnake[0];
      const move = DIRECTIONS[direction];
      const newHead = {
        x: (head.x + move.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + move.y + GRID_SIZE) % GRID_SIZE,
      };

      // Check collision with self
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        handleGameOver();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check collision with food
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 1);
        setFood(generateFood(newSnake));
        setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, generateFood, handleGameOver]);

  // Game Loop
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      const interval = setInterval(moveSnake, speed);
      return () => clearInterval(interval);
    }
  }, [status, speed, moveSnake]);

  // AI Commentary Trigger
  useEffect(() => {
    if (score > 0 && score % 5 === 0 && score !== lastScoreRef.current) {
      lastScoreRef.current = score;
      const triggerAI = async () => {
        setLoadingAI(true);
        const aiResp = await getGameCommentary(score, "PLAYING", [commentary]);
        setCommentary(aiResp.commentary);
        if (aiResp.themeDescription) setTheme(aiResp.themeDescription);
        setLoadingAI(false);
      };
      triggerAI();
    }
  }, [score, commentary]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (direction !== Direction.DOWN) setDirection(Direction.UP); break;
        case 'ArrowDown': if (direction !== Direction.UP) setDirection(Direction.DOWN); break;
        case 'ArrowLeft': if (direction !== Direction.RIGHT) setDirection(Direction.LEFT); break;
        case 'ArrowRight': if (direction !== Direction.LEFT) setDirection(Direction.RIGHT); break;
        case 'Enter': if (status !== GameStatus.PLAYING) resetGame(); break;
        case ' ': setStatus(prev => prev === GameStatus.PLAYING ? GameStatus.PAUSED : (prev === GameStatus.PAUSED ? GameStatus.PLAYING : prev)); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, status]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]"></div>
      </div>

      <header className="z-10 mb-8 text-center">
        <h1 className="text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2 font-pixel">
          SNAKE AI
        </h1>
        <p className="text-slate-400 uppercase tracking-widest text-sm">Level: {theme}</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 z-10 w-full max-w-5xl items-start justify-center">
        {/* Left Side: Stats & Commentary */}
        <div className="flex-1 w-full lg:max-w-xs space-y-4">
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-xl">
            <h2 className="text-slate-400 text-xs font-bold uppercase mb-4 tracking-wider">Game Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-[10px] uppercase">Score</p>
                <p className="text-3xl font-bold text-emerald-400">{score}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase">Best</p>
                <p className="text-3xl font-bold text-amber-400">{highScore}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-xl min-h-[160px] flex flex-col">
            <h2 className="text-slate-400 text-xs font-bold uppercase mb-4 tracking-wider flex justify-between items-center">
              Snake Master 
              {loadingAI && <span className="animate-pulse text-emerald-400 text-[10px]">Thinking...</span>}
            </h2>
            <p className="text-slate-200 italic text-lg leading-snug">
              "{commentary}"
            </p>
          </div>
        </div>

        {/* Center: Game Board */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div 
            className="relative bg-slate-950 border-4 border-slate-800 rounded-lg shadow-2xl overflow-hidden"
            style={{
              width: 'min(90vw, 500px)',
              height: 'min(90vw, 500px)',
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            }}
          >
            {/* Grid Rendering */}
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE;
              const y = Math.floor(i / GRID_SIZE);
              const isSnake = snake.some(s => s.x === x && s.y === y);
              const isHead = snake[0].x === x && snake[0].y === y;
              const isFood = food.x === x && food.y === y;

              return (
                <div 
                  key={i}
                  className={`w-full h-full transition-all duration-100 ${
                    isHead ? 'bg-emerald-400 scale-110 z-10 shadow-[0_0_10px_#10b981]' : 
                    isSnake ? 'bg-emerald-600 rounded-sm' : 
                    isFood ? 'bg-rose-500 animate-pulse rounded-full shadow-[0_0_15px_#f43f5e]' : 
                    'border-[0.5px] border-slate-900/50'
                  }`}
                />
              );
            })}

            {/* Overlays */}
            {status !== GameStatus.PLAYING && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 text-center p-6">
                {status === GameStatus.IDLE && (
                  <>
                    <p className="text-emerald-400 font-pixel text-xl mb-6">READY?</p>
                    <button 
                      onClick={resetGame}
                      className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                    >
                      START GAME
                    </button>
                    <p className="mt-4 text-slate-500 text-xs">Use Arrows to move. Space to Pause.</p>
                  </>
                )}
                {status === GameStatus.PAUSED && (
                  <>
                    <p className="text-cyan-400 font-pixel text-xl mb-6">PAUSED</p>
                    <button 
                      onClick={() => setStatus(GameStatus.PLAYING)}
                      className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-full transition-all hover:scale-105"
                    >
                      RESUME
                    </button>
                  </>
                )}
                {status === GameStatus.GAME_OVER && (
                  <>
                    <p className="text-rose-500 font-pixel text-xl mb-2">GAME OVER</p>
                    <p className="text-slate-400 mb-6 text-sm italic">"Don't let it get to you... but it was ugly."</p>
                    <div className="mb-8">
                      <p className="text-slate-500 text-xs uppercase tracking-widest">Score achieved</p>
                      <p className="text-4xl font-black text-white">{score}</p>
                    </div>
                    <button 
                      onClick={resetGame}
                      className="px-8 py-3 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-full transition-all hover:scale-105 shadow-lg shadow-rose-500/20"
                    >
                      RETRY
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Controls Info */}
        <div className="flex-1 w-full lg:max-w-xs space-y-4">
           <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-xl">
            <h2 className="text-slate-400 text-xs font-bold uppercase mb-4 tracking-wider">Instructions</h2>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-slate-300 text-sm">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded text-[10px]">UP</span>
                <span>Change Direction</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300 text-sm">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded text-[10px]">SPACE</span>
                <span>Toggle Pause</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300 text-sm">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded text-[10px]">ENT</span>
                <span>Quick Restart</span>
              </li>
            </ul>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl shadow-xl">
             <h2 className="text-emerald-400 text-xs font-bold uppercase mb-2 tracking-wider">AI Insight</h2>
             <p className="text-emerald-100/70 text-xs leading-relaxed">
               The Snake Master analyzes your slithering patterns. Grow your tail to unlock new dynamic commentary and world themes.
             </p>
          </div>
        </div>
      </div>

      <footer className="mt-12 text-slate-600 text-[10px] uppercase tracking-widest flex flex-col items-center gap-2">
        <span>Powered by Gemini 3 Flash & React</span>
        <div className="flex gap-4">
          <span>Grid: {GRID_SIZE}x{GRID_SIZE}</span>
          <span>•</span>
          <span>Speed: {speed}ms</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
