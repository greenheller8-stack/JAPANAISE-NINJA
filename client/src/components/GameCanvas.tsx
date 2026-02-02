import { useEffect, useRef, useState, useCallback } from "react";
import { useSubmitScore } from "@/hooks/use-scores";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Trophy, Pause } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Leaderboard } from "./Leaderboard";

// Game Constants
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const SPEED_INITIAL = 5;
const SPEED_INCREMENT = 0.001;

// Pixel Art Colors
const COLORS = {
  skyTop: "#4AA4FF",
  skyBottom: "#87CEEB", 
  cloud: "#FFFFFF",
  mountainFar: "#5B8FB9",
  mountainMid: "#4A7A9E",
  cliffBrown: "#8B5A2B",
  cliffDark: "#6B4423",
  cliffLight: "#A0714B",
  grass: "#4CAF50",
  grassDark: "#388E3C",
  treeTrunk: "#5D4037",
  treeLeaves: "#2E7D32",
  treeLeavesLight: "#4CAF50",
  ninja: "#1a1a1a",
  samurai: "#8B0000",
  samuraiGold: "#FFD700",
  sakura: "#FFB7C5",
};

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const [gameState, setGameState] = useState<"MENU" | "PLAYING" | "PAUSED" | "GAMEOVER">("MENU");
  const [score, setScore] = useState(0);
  const [username, setUsername] = useState("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const submitScore = useSubmitScore();

  useEffect(() => {
    const img = new Image();
    img.src = "/images/background.png";
    img.onload = () => {
      bgImageRef.current = img;
    };
  }, []);

  const frameRef = useRef<number>(0);
  const gameRef = useRef({
    speed: SPEED_INITIAL,
    distance: 0,
    ninja: { x: 100, y: 300, vy: 0, w: 30, h: 50, grounded: false, jumps: 0 },
    samurai: { x: -50, y: 300, targetX: -50 },
    obstacles: [] as { x: number; y: number; w: number; h: number; type: 'box' | 'bird' }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; size: number; life: number }[],
    bgOffset: 0,
    roofs: Array.from({ length: 8 }, (_, i) => ({
      x: i * 280,
      w: 260,
      h: 120,
      trees: Math.random() > 0.5 ? [{ offsetX: 100, height: 80 }] : []
    })),
    clouds: Array.from({ length: 10 }, (_, i) => ({
      x: i * 180,
      y: 50 + Math.random() * 120,
      scale: 0.5 + Math.random() * 0.8
    })),
    lastObstacleTime: 0,
    cameraShake: 0,
  });

  const initGame = () => {
    const canvas = canvasRef.current;
    const groundY = canvas ? canvas.height - 120 : 400;
    
    gameRef.current = {
      speed: SPEED_INITIAL,
      distance: 0,
      ninja: { x: 150, y: groundY - 50, vy: 0, w: 30, h: 50, grounded: false, jumps: 0 },
      samurai: { x: 50, y: groundY - 50, targetX: 50 },
      obstacles: [],
      particles: [],
      bgOffset: 0,
      roofs: Array.from({ length: 6 }, (_, i) => ({
        x: i * 280,
        w: 260,
        h: 120,
        trees: Math.random() > 0.5 ? [{ offsetX: Math.random() * 150 + 50, height: 60 + Math.random() * 40 }] : []
      })),
      clouds: Array.from({ length: 8 }, (_, i) => ({
        x: i * 200 + Math.random() * 100,
        y: 50 + Math.random() * 150,
        scale: 0.5 + Math.random() * 0.8
      })),
      lastObstacleTime: 0,
      cameraShake: 0,
    };
    setScore(0);
  };

  const jump = useCallback(() => {
    const { ninja } = gameRef.current;
    if (gameState !== "PLAYING") return;
    
    if (ninja.grounded || ninja.jumps < 2) {
      ninja.vy = JUMP_FORCE;
      ninja.grounded = false;
      ninja.jumps++;
      
      for (let i = 0; i < 3; i++) {
        gameRef.current.particles.push({
          x: ninja.x + ninja.w / 2,
          y: ninja.y + ninja.h,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 2,
          size: Math.random() * 3 + 2,
          life: 20
        });
      }
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); jump(); }
      if (e.code === "Escape" && gameState === "PLAYING") setGameState("PAUSED");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (gameState === "MENU") {
        const groundY = canvas.height - 120;
        gameRef.current.roofs = Array.from({ length: Math.ceil(canvas.width / 280) + 3 }, (_, i) => ({
          x: i * 280,
          w: 260,
          h: 120,
          trees: Math.random() > 0.5 ? [{ offsetX: Math.random() * 150 + 50, height: 60 + Math.random() * 40 }] : []
        }));
        gameRef.current.clouds = Array.from({ length: 10 }, (_, i) => ({
          x: i * 180 + Math.random() * 80,
          y: 40 + Math.random() * 120,
          scale: 0.5 + Math.random() * 0.8
        }));
        gameRef.current.ninja.y = groundY - 50;
        gameRef.current.samurai.y = groundY - 50;
      }
    };
    window.addEventListener("resize", resize);
    resize();

    const loop = () => {
      if (gameState === "PLAYING") {
        update(canvas);
      }
      draw(ctx, canvas);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState]);

  const update = (canvas: HTMLCanvasElement) => {
    const state = gameRef.current;
    const groundY = canvas.height - 120;

    state.speed += SPEED_INCREMENT;
    state.distance += state.speed / 10;
    const newScore = Math.floor(state.distance);
    setScore(newScore);

    state.ninja.vy += GRAVITY;
    state.ninja.y += state.ninja.vy;

    let onGround = false;
    for (const roof of state.roofs) {
      const roofTopY = groundY;
      if (
        state.ninja.x + state.ninja.w > roof.x &&
        state.ninja.x < roof.x + roof.w &&
        state.ninja.y + state.ninja.h >= roofTopY &&
        state.ninja.y + state.ninja.h <= roofTopY + 30
      ) {
        if (state.ninja.vy >= 0) {
          state.ninja.y = roofTopY - state.ninja.h;
          state.ninja.vy = 0;
          state.ninja.grounded = true;
          state.ninja.jumps = 0;
          onGround = true;
        }
      }
    }

    if (!onGround && state.ninja.y > canvas.height + 100) {
      gameOver();
      return;
    }

    const samuraiSpeed = state.speed * 0.98;
    state.samurai.x += (state.samurai.targetX - state.samurai.x) * 0.1;
    state.samurai.y = groundY - 60 + Math.sin(Date.now() / 100) * 3;

    if (state.ninja.x - state.samurai.x < 30) {
      gameOver();
      return;
    }
    
    if (state.ninja.x - state.samurai.x < 300) {
      state.samurai.targetX -= 0.3;
    }

    state.bgOffset += state.speed * 0.3;
    
    for (const cloud of state.clouds) {
      cloud.x -= state.speed * 0.2;
      if (cloud.x + 100 < 0) {
        cloud.x = canvas.width + 100;
        cloud.y = 40 + Math.random() * 120;
      }
    }

    for (let i = 0; i < state.roofs.length; i++) {
      state.roofs[i].x -= state.speed;
    }
    
    if (state.roofs[0].x + state.roofs[0].w < 0) {
      const lastRoof = state.roofs[state.roofs.length - 1];
      const gap = Math.random() > 0.7 ? Math.random() * 120 + 60 : 20;
      const newW = Math.random() * 150 + 180;
      
      state.roofs.shift();
      state.roofs.push({
        x: lastRoof.x + lastRoof.w + gap,
        w: newW,
        h: 120,
        trees: Math.random() > 0.4 ? [{ offsetX: Math.random() * (newW - 80) + 40, height: 60 + Math.random() * 40 }] : []
      });
    }

    if (Date.now() - state.lastObstacleTime > 2000 && Math.random() < 0.03) {
      const targetRoof = state.roofs[state.roofs.length - 1];
      if (targetRoof) {
        const type = Math.random() > 0.6 ? 'bird' : 'box';
        const obsH = type === 'bird' ? 30 : 40;
        const obsW = type === 'bird' ? 40 : 40;
        const obsY = type === 'bird' 
          ? groundY - 80 - Math.random() * 60
          : groundY - obsH;

        state.obstacles.push({
          x: targetRoof.x + Math.random() * (targetRoof.w - 80) + 40,
          y: obsY,
          w: obsW,
          h: obsH,
          type
        });
        state.lastObstacleTime = Date.now();
      }
    }

    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const obs = state.obstacles[i];
      obs.x -= state.speed + (obs.type === 'bird' ? 2 : 0);
      
      if (
        state.ninja.x < obs.x + obs.w &&
        state.ninja.x + state.ninja.w > obs.x &&
        state.ninja.y < obs.y + obs.h &&
        state.ninja.y + state.ninja.h > obs.y
      ) {
        state.cameraShake = 15;
        state.samurai.targetX += 80;
        state.obstacles.splice(i, 1);
        
        for (let p = 0; p < 4; p++) {
          state.particles.push({
            x: obs.x + obs.w / 2,
            y: obs.y + obs.h / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: 4,
            life: 20
          });
        }
      }

      if (obs.x + obs.w < 0) state.obstacles.splice(i, 1);
    }

    if (Math.random() > 0.95 && state.particles.length < 15) {
      state.particles.push({
        x: canvas.width + Math.random() * 50,
        y: Math.random() * canvas.height * 0.7,
        vx: -2 - Math.random() * 2,
        vy: 0.5 + Math.random() * 0.5,
        size: Math.random() * 4 + 3,
        life: 120
      });
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life > 0) p.x += Math.sin(p.life / 15) * 0.8;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    if (state.cameraShake > 0) state.cameraShake *= 0.9;
    if (state.cameraShake < 0.5) state.cameraShake = 0;
  };

  const gameOver = () => {
    setGameState("GAMEOVER");
  };

  const drawPixelCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => {
    ctx.fillStyle = COLORS.cloud;
    const s = 12 * scale;
    ctx.fillRect(x, y + s, s * 4, s * 2);
    ctx.fillRect(x + s, y, s * 2, s);
    ctx.fillRect(x - s * 0.5, y + s * 0.5, s, s);
    ctx.fillRect(x + s * 3.5, y + s * 0.5, s, s);
  };

  const drawPixelTree = (ctx: CanvasRenderingContext2D, x: number, groundY: number, height: number) => {
    const trunkW = 12;
    const trunkH = height * 0.4;
    
    ctx.fillStyle = COLORS.treeTrunk;
    ctx.fillRect(x - trunkW / 2, groundY - trunkH, trunkW, trunkH);
    
    const leafLayers = 3;
    for (let i = 0; i < leafLayers; i++) {
      const layerY = groundY - trunkH - i * 20 - 10;
      const layerW = 50 - i * 10;
      ctx.fillStyle = i === leafLayers - 1 ? COLORS.treeLeavesLight : COLORS.treeLeaves;
      ctx.fillRect(x - layerW / 2, layerY - 25, layerW, 30);
      
      ctx.fillStyle = COLORS.treeLeavesLight;
      ctx.fillRect(x - layerW / 2 + 5, layerY - 20, 10, 10);
    }
  };

  const drawPixelMountain = (ctx: CanvasRenderingContext2D, x: number, baseY: number, width: number, height: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + width / 2, baseY - height);
    ctx.lineTo(x + width, baseY);
    ctx.closePath();
    ctx.fill();
  };

  const drawPixelNinja = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = COLORS.ninja;
    ctx.fillRect(x + 5, y, w - 10, h);
    ctx.fillRect(x, y + 10, w, h - 20);
    ctx.fillRect(x + 8, y - 5, w - 16, 10);
    
    ctx.fillStyle = "#DC143C";
    ctx.fillRect(x + 2, y + 2, w - 4, 4);
    const bandWave = Math.sin(Date.now() / 100) * 3;
    ctx.fillRect(x - 15, y + 2 + bandWave, 15, 4);
    ctx.fillRect(x - 25, y + 4 + bandWave * 1.2, 12, 3);
    
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x + w - 12, y + 8, 8, 4);
    ctx.fillStyle = "#000000";
    ctx.fillRect(x + w - 10, y + 9, 3, 2);
  };

  const drawPixelSamurai = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = COLORS.samurai;
    ctx.fillRect(x + 5, y + 15, 35, 45);
    ctx.fillRect(x + 10, y + 5, 25, 15);
    
    ctx.fillStyle = COLORS.samuraiGold;
    ctx.fillRect(x + 5, y, 8, 15);
    ctx.fillRect(x + 32, y, 8, 15);
    ctx.fillRect(x + 8, y + 5, 29, 5);
    
    ctx.fillStyle = "#C0C0C0";
    ctx.fillRect(x + 40, y + 25, 30, 4);
    ctx.fillRect(x + 65, y + 23, 8, 8);
    
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x + 28, y + 10, 6, 3);
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(x + 30, y + 11, 2, 1);
  };

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const state = gameRef.current;
    const groundY = canvas.height - 120;

    ctx.save();
    if (state.cameraShake > 0) {
      const dx = (Math.random() - 0.5) * state.cameraShake;
      const dy = (Math.random() - 0.5) * state.cameraShake;
      ctx.translate(dx, dy);
    }

    if (bgImageRef.current) {
      const img = bgImageRef.current;
      const imgAspect = img.width / img.height;
      const canvasAspect = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (canvasAspect > imgAspect) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgAspect;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      } else {
        drawHeight = canvas.height;
        drawWidth = canvas.height * imgAspect;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      }
      
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, COLORS.skyTop);
      gradient.addColorStop(0.7, COLORS.skyBottom);
      gradient.addColorStop(1, "#E8F4FD");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    (state.roofs || []).forEach(roof => {
      const cliffTop = groundY;
      const cliffBottom = canvas.height;
      
      ctx.fillStyle = COLORS.cliffBrown;
      ctx.fillRect(roof.x, cliffTop, roof.w, cliffBottom - cliffTop);
      
      ctx.fillStyle = COLORS.cliffDark;
      ctx.fillRect(roof.x, cliffTop + 20, 15, cliffBottom - cliffTop - 20);
      ctx.fillRect(roof.x + roof.w - 15, cliffTop + 20, 15, cliffBottom - cliffTop - 20);
      
      ctx.fillStyle = COLORS.cliffLight;
      for (let px = roof.x + 20; px < roof.x + roof.w - 20; px += 40) {
        ctx.fillRect(px, cliffTop + 30 + (px % 60), 8, 25);
        ctx.fillRect(px + 15, cliffTop + 60 + ((px + 20) % 50), 6, 20);
      }
      
      ctx.fillStyle = COLORS.grass;
      ctx.fillRect(roof.x - 5, cliffTop - 8, roof.w + 10, 12);
      
      ctx.fillStyle = COLORS.grassDark;
      for (let gx = roof.x; gx < roof.x + roof.w; gx += 8) {
        const grassH = 4 + Math.random() * 6;
        ctx.fillRect(gx, cliffTop - 8 - grassH, 3, grassH);
      }
      
      roof.trees.forEach(tree => {
        drawPixelTree(ctx, roof.x + tree.offsetX, cliffTop - 8, tree.height);
      });
    });

    (state.obstacles || []).forEach(obs => {
      if (obs.type === 'box') {
        ctx.fillStyle = "#654321";
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(obs.x + 3, obs.y + 3, obs.w - 6, obs.h - 6);
        ctx.fillStyle = "#A0522D";
        ctx.fillRect(obs.x + 6, obs.y + 6, 8, 8);
      } else {
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(obs.x + 10, obs.y + 10, 20, 15);
        ctx.fillRect(obs.x + 15, obs.y + 5, 10, 10);
        
        const wingY = Math.sin(Date.now() / 80) * 8;
        ctx.fillRect(obs.x, obs.y + wingY, 15, 8);
        ctx.fillRect(obs.x + 25, obs.y + wingY, 15, 8);
        
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(obs.x + 25, obs.y + 8, 8, 4);
      }
    });

    const { ninja } = state;
    drawPixelNinja(ctx, ninja.x, ninja.y, ninja.w, ninja.h);

    const { samurai } = state;
    if (samurai.x > -100) {
      drawPixelSamurai(ctx, samurai.x, samurai.y);
    }

    (state.particles || []).forEach(p => {
      const alpha = Math.min(1, p.life / 50);
      ctx.fillStyle = `rgba(255, 183, 197, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size, p.size * 0.6, Math.sin(p.life / 15), 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  const handleScoreSubmit = async () => {
    if (!username.trim()) return;
    try {
      await submitScore.mutateAsync({ username, score });
      setShowLeaderboard(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none font-display">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        data-testid="game-canvas"
        onMouseDown={jump}
        onTouchStart={(e) => { e.preventDefault(); jump(); }}
      />
      
      <AnimatePresence mode="wait">
        {gameState === "MENU" && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-50"
          >
            <div className="game-panel p-10 flex flex-col items-center gap-6 max-w-md w-full">
              <h1 className="text-5xl md:text-6xl font-bold text-primary drop-shadow-md text-center leading-tight">
                Japanese<br/>Ninja
              </h1>
              <p className="text-muted-foreground font-body text-center">
                Escape the Samurai. Jump over rooftops.<br/>
                Tap or Space to Jump.
              </p>
              
              <div className="flex flex-col w-full gap-3">
                <Button 
                  size="lg" 
                  className="w-full text-xl h-14 bg-primary hover:bg-primary/90"
                  data-testid="button-start-game" 
                  onClick={() => {
                    initGame();
                    setGameState("PLAYING");
                  }}
                >
                  <Play className="mr-2 w-6 h-6" /> Start Game
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full h-12"
                  data-testid="button-high-scores" 
                  onClick={() => setShowLeaderboard(true)}
                >
                  <Trophy className="mr-2 w-5 h-5" /> High Scores
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === "GAMEOVER" && (
          <motion.div 
            key="gameover"
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/60 backdrop-blur-md z-50"
          >
            <div className="game-panel p-8 w-full max-w-sm text-center">
              <h2 className="text-4xl font-bold text-destructive mb-2">Game Over</h2>
              <div className="text-6xl font-bold text-primary mb-6" data-testid="text-final-score">{score}m</div>
              
              {!showLeaderboard ? (
                <div className="space-y-4">
                  <Input 
                    placeholder="Enter Ninja Name" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="text-center text-xl font-bold bg-white/50"
                    maxLength={10}
                    data-testid="input-username"
                  />
                  <Button 
                    className="w-full h-12 text-lg"
                    data-testid="button-submit-score" 
                    onClick={handleScoreSubmit}
                    disabled={submitScore.isPending || !username}
                  >
                    {submitScore.isPending ? "Submitting..." : "Submit Score"}
                  </Button>
                  <Button variant="ghost" data-testid="button-back-menu" onClick={() => setGameState("MENU")}>
                    Back to Menu
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-64 overflow-y-auto pr-2 scrollbar-thin">
                    <Leaderboard />
                  </div>
                  <Button className="w-full" data-testid="button-play-again" onClick={() => setGameState("MENU")}>
                    <RotateCcw className="mr-2 w-4 h-4" /> Play Again
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {gameState === "PLAYING" && (
          <motion.div key="hud" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-4 right-4 flex items-center gap-4 z-10">
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full font-bold text-2xl border-2 border-primary shadow-lg text-primary" data-testid="text-score">
              {score}m
            </div>
            <Button size="icon" variant="secondary" className="rounded-full h-12 w-12 shadow-lg" data-testid="button-pause" onClick={() => setGameState("PAUSED")}>
              <Pause className="w-6 h-6" />
            </Button>
          </motion.div>
        )}

        {gameState === "PAUSED" && (
          <motion.div key="paused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-40">
            <Button size="lg" className="text-2xl px-12 py-8 rounded-2xl shadow-2xl animate-pulse" data-testid="button-resume" onClick={() => setGameState("PLAYING")}>
              RESUME
            </Button>
          </motion.div>
        )}
        
        {showLeaderboard && gameState === "MENU" && (
          <motion.div key="leaderboard-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
            <div className="game-panel p-6 w-full max-w-md relative">
              <button 
                onClick={() => setShowLeaderboard(false)}
                className="absolute top-2 right-2 p-2 hover:bg-black/5 rounded-full"
                data-testid="button-close-leaderboard"
              >
                X
              </button>
              <Leaderboard />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
