/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Cpu, Volume2, Gamepad2, VolumeX } from 'lucide-react';

// --- Game Constants ---
const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIR = { x: 0, y: 0 };
const TICK_RATE = 100; // ms

// --- Dummy AI Music Tracks ---
const TRACKS = [
  {
    id: 1,
    title: 'ERR: AUDIO_MATRIX_FAIL',
    artist: 'NEURAL_NODE_7',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 2,
    title: 'GLITCH.WAV // CORRUPTED',
    artist: 'HOST_MACHINE_99',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  },
  {
    id: 3,
    title: 'SYS.OVERRIDE_BASS',
    artist: 'UNKNOWN_ENTITY',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
  },
];

type Point = { x: number; y: number };

type GameState = {
  snake: Point[];
  dir: Point;
  lastProcessedDir: Point;
  food: Point;
  score: number;
  gameOver: boolean;
  hasStarted: boolean;
};

const getRandomFoodPosition = (snake: Point[]): Point => {
  let newFood: Point;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      break;
    }
  }
  return newFood;
};

export default function App() {
  // --- Game State ---
  const [gameState, setGameState] = useState<GameState>({
    snake: INITIAL_SNAKE,
    dir: INITIAL_DIR,
    lastProcessedDir: INITIAL_DIR,
    food: { x: 15, y: 10 },
    score: 0,
    gameOver: false,
    hasStarted: false,
  });

  const [glitchActive, setGlitchActive] = useState(false);

  // --- Audio State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Random Glitch Effect ---
  useEffect(() => {
    const triggerGlitch = () => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), Math.random() * 300 + 100);
    };

    const intervalId = setInterval(() => {
      if (Math.random() > 0.7) {
        triggerGlitch();
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, []);

  // --- Game Hooks ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isUp = key === 'arrowup' || key === 'w';
      const isDown = key === 'arrowdown' || key === 's';
      const isLeft = key === 'arrowleft' || key === 'a';
      const isRight = key === 'arrowright' || key === 'd';

      if (isUp || isDown || isLeft || isRight) {
        e.preventDefault(); 
      }

      setGameState(prev => {
        if (prev.gameOver) return prev;

        const { lastProcessedDir } = prev;
        let newDir = prev.dir;
        let started = prev.hasStarted;

        if (isUp && lastProcessedDir.y !== 1) { newDir = { x: 0, y: -1 }; started = true; }
        else if (isDown && lastProcessedDir.y !== -1) { newDir = { x: 0, y: 1 }; started = true; }
        else if (isLeft && lastProcessedDir.x !== 1) { newDir = { x: -1, y: 0 }; started = true; }
        else if (isRight && lastProcessedDir.x !== -1) { newDir = { x: 1, y: 0 }; started = true; }

        return { ...prev, dir: newDir, hasStarted: started };
      });
    };

    window.addEventListener('keydown', handleKeyDown);

    const moveInterval = setInterval(() => {
      setGameState(prev => {
        if (!prev.hasStarted || prev.gameOver) return prev;

        const head = prev.snake[0];
        const newHead = { x: head.x + prev.dir.x, y: head.y + prev.dir.y };

        // Wrap around walls
        if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
        if (newHead.x >= GRID_SIZE) newHead.x = 0;
        if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
        if (newHead.y >= GRID_SIZE) newHead.y = 0;

        // Self Collision
        if (prev.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setGlitchActive(true);
          setTimeout(() => setGlitchActive(false), 500);
          return { ...prev, gameOver: true };
        }

        const newSnake = [newHead, ...prev.snake];
        let newScore = prev.score;
        let newFood = prev.food;

        // Food Collision
        if (newHead.x === prev.food.x && newHead.y === prev.food.y) {
          newScore += 16; // Hexadecimal-ish score step
          newFood = getRandomFoodPosition(newSnake);
          // slight glitch on eat
          setGlitchActive(true);
          setTimeout(() => setGlitchActive(false), 150);
        } else {
          newSnake.pop();
        }

        return {
          ...prev,
          snake: newSnake,
          score: newScore,
          food: newFood,
          lastProcessedDir: prev.dir,
        };
      });
    }, TICK_RATE);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(moveInterval);
    };
  }, []);

  const resetGame = () => {
    setGameState({
      snake: INITIAL_SNAKE,
      dir: INITIAL_DIR,
      lastProcessedDir: INITIAL_DIR,
      food: getRandomFoodPosition(INITIAL_SNAKE),
      score: 0,
      gameOver: false,
      hasStarted: false,
    });
  };

  // --- Audio Hooks ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => {
          console.warn('Playback intercepted by host logic.', err);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const nextTrack = () => {
    setCurrentTrackIndex(prev => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentTrackIndex(prev => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const currentTrack = TRACKS[currentTrackIndex];

  return (
    <div className={`min-h-screen bg-black text-green-500 font-mono relative overflow-hidden selection:bg-fuchsia-600 selection:text-white ${glitchActive ? 'animate-glitch' : ''}`}>
      
      {/* Noise and Scanlines Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-30 scanline-overlay"></div>
      <div className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay noise-overlay"></div>

      {/* Main Grid Wrapper */}
      <div className="relative z-10 min-h-screen flex flex-col p-4 md:p-8 max-w-7xl mx-auto">
        
        {/* Header Element */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-cyan-500 pb-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-pixel font-bold text-fuchsia-500 uppercase tracking-widest break-all" data-text="TERMINAL_SNAKE_OS">
              <span className="glitch-text" data-text="TERMINAL_SNAKE_OS">TERMINAL_SNAKE_OS</span>
            </h1>
            <p className="text-cyan-400 mt-2 font-mono text-sm uppercase tracking-[0.2em] opacity-80">
              Session_ID: {Math.random().toString(16).slice(2, 10).toUpperCase()}
            </p>
          </div>
          <div className="flex flex-col items-end mt-4 md:mt-0">
            <span className="text-xs text-neutral-500 font-mono">DATA_LOG</span>
            <div className="flex items-center gap-2 bg-neutral-900 border border-fuchsia-500 p-2 text-fuchsia-400 font-pixel text-2xl px-4 min-w-[120px] justify-end shadow-[4px_4px_0_0_#0ff]">
              {gameState.score.toString(16).toUpperCase().padStart(4, '0')}
            </div>
          </div>
        </header>

        {/* Workspace Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 mb-24">
          
          {/* Left Pane - System Data */}
          <aside className="md:col-span-3 lg:col-span-3 hidden md:flex flex-col gap-6">
            <div className="border border-cyan-500 p-4 bg-cyan-950/20 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-2 bg-cyan-500"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 bg-fuchsia-500"></div>
              <h2 className="text-cyan-300 font-bold mb-2 uppercase text-sm flex items-center gap-2 border-b border-cyan-800 pb-2">
                <Cpu className="w-4 h-4" /> System Stats
              </h2>
              <ul className="text-xs space-y-2 text-cyan-500/80">
                <li className="flex justify-between"><span>CPU_TEMP:</span> <span>{(Math.random() * 20 + 60).toFixed(1)}°C</span></li>
                <li className="flex justify-between"><span>MEM_ALLOC:</span> <span>0x{(gameState.snake.length * 256).toString(16).toUpperCase()}</span></li>
                <li className="flex justify-between"><span>OVERRIDE:</span> <span className={glitchActive ? 'text-fuchsia-500' : ''}>{glitchActive ? 'TRUE' : 'FALSE'}</span></li>
                <li className="flex justify-between"><span>SNAKE_LEN:</span> <span>{gameState.snake.length}</span></li>
              </ul>
            </div>

            <div className="border border-fuchsia-500 p-4 bg-fuchsia-950/20 backdrop-blur-sm h-full max-h-[300px] overflow-hidden flex flex-col relative group cursor-crosshair">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-fuchsia-500 opacity-50 group-hover:translate-y-[200px] transition-transform duration-1000 linear"></div>
              <h2 className="text-fuchsia-300 font-bold mb-2 uppercase text-sm border-b border-fuchsia-800 pb-2">
                Runtime Log
              </h2>
              <div className="text-[10px] break-words text-fuchsia-500/60 leading-tight space-y-1 overflow-hidden font-pixel">
                {Array.from({length: 15}).map((_,i) => (
                  <p key={i} className="opacity-70">&gt; {(Math.random().toString(36).substring(2, 15)).toUpperCase()}</p>
                ))}
              </div>
            </div>
          </aside>

          {/* Center Pane - Game Canvas */}
          <main className="col-span-1 md:col-span-9 lg:col-span-6 flex flex-col items-center">
            
            <div className="w-full max-w-[450px] bg-black border-2 border-cyan-500 p-1 relative shadow-[0_0_20px_rgba(0,255,255,0.2)]">
              
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-fuchsia-500"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-fuchsia-500"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-fuchsia-500"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-fuchsia-500"></div>

              <div className="aspect-square relative bg-neutral-900 overflow-hidden">
                
                {/* Background Grid Lines */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #00ffff 1px, transparent 1px), linear-gradient(to bottom, #00ffff 1px, transparent 1px)',
                    backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`
                  }}
                ></div>

                {/* Overlays */}
                {!gameState.hasStarted && !gameState.gameOver && (
                  <div className="absolute inset-0 z-20 flex bg-black/60 backdrop-blur-sm items-center justify-center">
                    <div className="border border-cyan-500 bg-black p-4 text-center cursor-blink">
                      <Gamepad2 className="w-8 h-8 text-cyan-400 mx-auto mb-2 animate-pulse" />
                      <p className="text-cyan-400 font-pixel text-xl uppercase tracking-wider animate-pulse">
                        &gt; AWAKEN_PROTOCOL
                      </p>
                      <p className="text-xs mt-2 text-cyan-600">[PRESS ANY DIR TO EXECUTE]</p>
                    </div>
                  </div>
                )}

                {gameState.gameOver && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm border-2 border-fuchsia-600 m-4">
                    <h2 className="text-4xl font-pixel text-fuchsia-500 glitch-text uppercase mb-2" data-text="FATAL_ERROR">
                      FATAL_ERROR
                    </h2>
                    <p className="text-cyan-300 font-mono text-sm mb-6 bg-cyan-900/40 px-2 border border-cyan-700">
                      MEMORY_DUMP: 0x{gameState.score.toString(16).toUpperCase()}
                    </p>
                    <button
                      onClick={resetGame}
                      className="px-6 py-2 bg-transparent border-2 border-fuchsia-500 text-fuchsia-400 font-pixel text-xl hover:bg-fuchsia-500 hover:text-black transition-colors uppercase active:scale-95"
                    >
                      &gt; REBOOT
                    </button>
                  </div>
                )}

                {/* Food Item */}
                <div
                  className="absolute bg-fuchsia-500 animate-pulse border border-white"
                  style={{
                    left: `${(gameState.food.x / GRID_SIZE) * 100}%`,
                    top: `${(gameState.food.y / GRID_SIZE) * 100}%`,
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                    boxShadow: '0 0 10px #f0f'
                  }}
                />

                {/* Snake Body */}
                {gameState.snake.map((segment, i) => {
                  const isHead = i === 0;
                  return (
                    <div
                      key={i}
                      className={`absolute transition-all duration-75 ${
                        isHead 
                          ? 'bg-cyan-300 border border-white z-10' 
                          : 'bg-cyan-700 border border-cyan-500 opacity-90'
                      }`}
                      style={{
                        left: `${(segment.x / GRID_SIZE) * 100}%`,
                        top: `${(segment.y / GRID_SIZE) * 100}%`,
                        width: `${100 / GRID_SIZE}%`,
                        height: `${100 / GRID_SIZE}%`,
                        transform: isHead ? 'scale(1.1)' : 'scale(0.9)',
                        boxShadow: isHead ? '0 0 10px #0ff' : 'none'
                      }}
                    />
                  );
                })}
              </div>
            </div>
            
            {/* Mobile controls replacement visual hint */}
            <div className="mt-6 text-center text-xs text-neutral-500 md:hidden flex justify-center gap-4 uppercase">
              <span className="border border-neutral-700 px-2 py-1">[W] UP</span>
              <span className="border border-neutral-700 px-2 py-1">[A] LEFT</span>
              <span className="border border-neutral-700 px-2 py-1">[S] DOWN</span>
              <span className="border border-neutral-700 px-2 py-1">[D] RIGHT</span>
            </div>

          </main>

          {/* Right Pane (Empty space for desktop balance) */}
          <aside className="hidden lg:flex col-span-3 flex-col justify-end">
            <div className="w-full border-l-4 border-fuchsia-500 pl-4 py-2 text-fuchsia-400 font-pixel opacity-50">
              <p>WARNING:</p>
              <p>AUDIO_LINK ESTABLISHED.</p>
              <p>BEWARE OF SYNTHETIC REVERB.</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Audio Control Panel - Bottom Bar */}
      <footer className="fixed bottom-0 w-full z-50 border-t-2 border-cyan-500 bg-black/90 backdrop-blur-md pb-safe">
        
        <audio
          ref={audioRef}
          src={currentTrack.url}
          onEnded={nextTrack}
          crossOrigin="anonymous"
        />

        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Track Display */}
          <div className="flex bg-cyan-950/40 border border-cyan-700 p-2 items-center gap-4 w-full md:w-auto relative group">
            <div className="absolute top-0 right-0 w-full h-[1px] bg-cyan-400"></div>
            <div className={`w-10 h-10 flex items-center justify-center bg-black border border-cyan-500 ${isPlaying ? 'animate-pulse shadow-[0_0_10px_#0ff]' : ''}`}>
               {isPlaying ? 
                <Cpu className="w-6 h-6 text-cyan-400" /> : 
                <VolumeX className="w-6 h-6 text-neutral-600" />
               }
            </div>
            <div className="flex flex-col min-w-[200px] flex-1">
              <span className="text-fuchsia-400 font-pixel text-lg leading-none truncate uppercase">
                {currentTrack.title}
              </span>
              <span className="text-cyan-600 text-xs font-mono uppercase tracking-wider truncate">
                SRC: {currentTrack.artist}
              </span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={prevTrack}
              className="text-cyan-600 hover:text-cyan-400 hover:bg-cyan-950 px-3 py-2 border border-transparent hover:border-cyan-600 transition-colors"
            >
              <SkipBack className="w-6 h-6" fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              className="w-14 h-12 bg-cyan-600 text-black flex items-center justify-center hover:bg-cyan-400 active:bg-cyan-200 transition-colors shadow-[4px_4px_0_0_#f0f]"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" fill="currentColor" />
              ) : (
                <Play className="w-6 h-6 ml-1" fill="currentColor" />
              )}
            </button>
            <button
              onClick={nextTrack}
              className="text-cyan-600 hover:text-cyan-400 hover:bg-cyan-950 px-3 py-2 border border-transparent hover:border-cyan-600 transition-colors"
            >
              <SkipForward className="w-6 h-6" fill="currentColor" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="w-full md:w-[200px] flex items-center justify-center md:justify-end gap-3 px-4">
            <Volume2 className="w-4 h-4 text-cyan-600" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-transparent appearance-none border border-cyan-700 cursor-crosshair
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-fuchsia-500 [&::-webkit-slider-thumb]:rounded-none"
            />
          </div>

        </div>
      </footer>

    </div>
  );
}
