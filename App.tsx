
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameStatus, Direction, Point } from './types';
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

  const lastScoreRef = useRef(0);
  const touchStartRef = useRef<Point | null>(null);

  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
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
    
    // AI call is wrapped to prevent it from affecting game flow
    try {
      setLoadingAI(true);
      const aiResp = await getGameCommentary(score, "GAME_OVER", [commentary]);
      setCommentary(aiResp.commentary || "Game Over.");
    } catch (e) {
      setCommentary("Game Over. Slither again?");
    } finally {
      setLoadingAI(false);
    }
  }, [score, highScore, commentary]);

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      if (status !== GameStatus.PLAYING) return prevSnake;

      const head = prevSnake[0];
      const move = DIRECTIONS[direction];
      const newHead = {
        x: (head.x + move.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + move.y + GRID_SIZE) % GRID_SIZE,
      };

      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        handleGameOver();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 1);
        setFood(generateFood(newSnake));
        setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, generateFood, handleGameOver, status]);

  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      const interval = setInterval(moveSnake, speed);
      return () => clearInterval(interval);
    }
  }, [status, speed, moveSnake]);

  useEffect(() => {
    if (score > 0 && score % 5 === 0 && score !== lastScoreRef.current) {
      lastScoreRef.current = score;
      const triggerAI = async () => {
        try {
          setLoadingAI(true);
          const aiResp = await getGameCommentary(score, "PLAYING", [commentary]);
          if (aiResp.commentary) setCommentary(aiResp.commentary);
          if (aiResp.themeDescription) setTheme(aiResp.themeDescription);
        } catch (e) {
          // Fail silently
        } finally {
          setLoadingAI(false);
        }
      };
      triggerAI();
    }
  }, [score, commentary]);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const minSwipeDistance = 30;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minSwipeDistance) {
        if (dx > 0 && direction !== Direction.LEFT) setDirection(Direction.RIGHT);
        else if (dx < 0 && direction !== Direction.RIGHT) setDirection(Direction.LEFT);
      }
    } else {
      if (Math.abs(dy) > minSwipeDistance) {
        if (dy > 0 && direction !== Direction.UP) setDirection(Direction.DOWN);
        else if (dy < 0 && direction !== Direction.DOWN) setDirection(Direction.UP);
      }
    }
    touchStartRef.current = null;
  };

  const handleControlPress = (newDir: Direction) => {
    if (status !== GameStatus.PLAYING) return;
    if (newDir === Direction.UP && direction !== Direction.DOWN) setDirection(Direction.UP);
    if (newDir === Direction.DOWN && direction !== Direction.UP) setDirection(Direction.DOWN);
    if (newDir === Direction.LEFT && direction !== Direction.RIGHT) setDirection(Direction.LEFT);
    if (newDir === Direction.RIGHT && direction !== Direction.LEFT) setDirection(Direction.RIGHT);
  };

  return (
    <div 
      className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]"></div>
      </div>

      <header className="z-10 mb-2 sm:mb-8 text-center shrink-0 landscape:hidden lg:landscape:block">
        <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-1 font-pixel">
          SNAKE AI
        </h1>
        <p className="text-slate-400 uppercase tracking-widest text-[8px] sm:text-sm">Level: {theme}</p>
      </header>

      <div className="flex flex-col lg:flex-row landscape:flex-row gap-4 sm:gap-8 z-10 w-full max-w-6xl items-center lg:items-start justify-center">
        
        <div className="hidden lg:flex flex-col w-full lg:max-w-xs space-y-4">
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

        <div className="lg:hidden landscape:hidden flex justify-between w-full px-4 mb-2">
           <div className="flex gap-4">
              <span className="text-slate-400 text-[10px] uppercase">Score: <span className="text-emerald-400 font-bold">{score}</span></span>
              <span className="text-slate-400 text-[10px] uppercase">Best: <span className="text-amber-400 font-bold">{highScore}</span></span>
           </div>
           <div className="text-right">
             <span className="text-slate-400 text-[10px] uppercase italic truncate max-w-[150px] inline-block">"{commentary}"</span>
           </div>
        </div>

        <div className="relative group shrink-0">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div 
            className="relative bg-slate-950 border-4 border-slate-800 rounded-lg shadow-2xl overflow-hidden"
            style={{
              width: 'min(75vw, 75vh, 450px)',
              height: 'min(75vw, 75vh, 450px)',
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            }}
          >
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

            {status !== GameStatus.PLAYING && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 text-center p-6">
                {status === GameStatus.IDLE && (
                  <>
                    <p className="text-emerald-400 font-pixel text-lg mb-6 animate-bounce">READY?</p>
                    <button 
                      onClick={resetGame}
                      className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg"
                    >
                      START
                    </button>
                    <p className="mt-4 text-slate-500 text-[10px]">Swipe or use controls to move.</p>
                  </>
                )}
                {status === GameStatus.PAUSED && (
                  <>
                    <p className="text-cyan-400 font-pixel text-lg mb-6">PAUSED</p>
                    <button 
                      onClick={() => setStatus(GameStatus.PLAYING)}
                      className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-full transition-all hover:scale-105"
                    >
                      RESUME
                    </button>
                  </>
                )}
                {status === GameStatus.GAME_OVER && (
                  <>
                    <p className="text-rose-500 font-pixel text-lg mb-2">GAME OVER</p>
                    <div className="mb-4">
                      <p className="text-slate-500 text-[10px] uppercase">Final Score</p>
                      <p className="text-3xl font-black text-white">{score}</p>
                    </div>
                    <button 
                      onClick={resetGame}
                      className="px-6 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-full transition-all hover:scale-105"
                    >
                      RETRY
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex lg:flex-col landscape:flex-col items-center justify-center gap-4 w-full lg:w-auto">
          
          <div className="hidden landscape:flex lg:hidden flex-col gap-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700 w-32">
             <div className="text-center">
                <p className="text-slate-500 text-[8px] uppercase">Score</p>
                <p className="text-xl font-bold text-emerald-400 leading-none">{score}</p>
             </div>
             <div className="text-center">
                <p className="text-slate-500 text-[8px] uppercase">Best</p>
                <p className="text-xl font-bold text-amber-400 leading-none">{highScore}</p>
             </div>
             <div className="mt-1 pt-1 border-t border-slate-700 text-center">
                <p className="text-slate-400 text-[8px] leading-tight italic truncate">"{commentary}"</p>
             </div>
          </div>

          <div className="lg:hidden w-auto flex flex-col items-center justify-center shrink-0">
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              <div />
              <button 
                onPointerDown={() => handleControlPress(Direction.UP)}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-center text-slate-400 active:bg-emerald-500 active:text-slate-900 transition-colors shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <div />
              <button 
                onPointerDown={() => handleControlPress(Direction.LEFT)}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-center text-slate-400 active:bg-emerald-500 active:text-slate-900 transition-colors shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                onClick={() => setStatus(prev => prev === GameStatus.PLAYING ? GameStatus.PAUSED : (prev === GameStatus.PAUSED ? GameStatus.PLAYING : prev))}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-700/50 border border-slate-600 rounded-full flex items-center justify-center text-slate-300"
              >
                {status === GameStatus.PLAYING ? '||' : '▶'}
              </button>
              <button 
                onPointerDown={() => handleControlPress(Direction.RIGHT)}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-center text-slate-400 active:bg-emerald-500 active:text-slate-900 transition-colors shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div />
              <button 
                onPointerDown={() => handleControlPress(Direction.DOWN)}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-center text-slate-400 active:bg-emerald-500 active:text-slate-900 transition-colors shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div />
            </div>
          </div>
        </div>

        <div className="hidden lg:flex flex-col w-full lg:max-w-xs space-y-4">
           <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-xl">
            <h2 className="text-slate-400 text-xs font-bold uppercase mb-4 tracking-wider">Instructions</h2>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-slate-300 text-sm">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded text-[10px]">UP</span>
                <span>Move</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300 text-sm">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded text-[10px]">SPACE</span>
                <span>Pause</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <footer className="mt-auto landscape:mt-2 sm:mt-8 mb-2 text-slate-600 text-[8px] uppercase tracking-widest flex flex-col items-center gap-1">
        <span>Powered by Gemini 3 Flash & React</span>
        <div className="flex gap-4">
          <span>{GRID_SIZE}x{GRID_SIZE}</span>
          <span>•</span>
          <span>{speed}ms</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
