import { useEffect, useRef, useState } from 'react';
import { useRetroAudio } from '../utils/useRetroAudio';
import { useHighScore } from '../utils/useHighScore';

interface Props {
  isPaused: boolean;
  isMuted: boolean;
  onScore: (score: number) => void;
}

export default function DataBreaker({ isPaused, isMuted, onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  
  const audio = useRetroAudio(isMuted);
  const { saveHighScore } = useHighScore('data-breaker');

  // Game Constants
  const WIDTH = 320;
  const HEIGHT = 250;
  const PADDLE_W = 60;
  const PADDLE_H = 8;
  const BALL_R = 4;
  const BRICK_ROWS = 4;
  const BRICK_COLS = 6;
  const BRICK_W = 46;
  const BRICK_H = 12;
  const BRICK_PAD = 4;
  const BRICK_OFFSET_TOP = 30;
  const BRICK_OFFSET_LEFT = (WIDTH - (BRICK_COLS * (BRICK_W + BRICK_PAD))) / 2 + (BRICK_PAD/2);

  // Mutable Game State
  const state = useRef({
    paddleX: (WIDTH - PADDLE_W) / 2,
    ballX: WIDTH / 2,
    ballY: HEIGHT - 30,
    dx: 150, // px per sec
    dy: -150,
    bricks: [] as {x: number, y: number, status: number, color: string, label: string}[],
    lastTime: 0
  });

  const initBricks = () => {
    const labels = ['VENDOR', 'AMOUNT', 'DATE', 'TAX', 'TOTAL', 'ID'];
    const colors = ['#38bdf8', '#818cf8', '#34d399', '#f472b6']; // sky, indigo, emerald, pink
    const bricks = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      for (let r = 0; r < BRICK_ROWS; r++) {
        bricks.push({
          x: BRICK_OFFSET_LEFT + c * (BRICK_W + BRICK_PAD),
          y: BRICK_OFFSET_TOP + r * (BRICK_H + BRICK_PAD),
          status: 1,
          color: colors[r],
          label: labels[c]
        });
      }
    }
    state.current.bricks = bricks;
  };

  const resetGame = () => {
    state.current.paddleX = (WIDTH - PADDLE_W) / 2;
    state.current.ballX = WIDTH / 2;
    state.current.ballY = HEIGHT - 30;
    state.current.dx = 150;
    state.current.dy = -150;
    setScore(0);
    initBricks();
    setGameState('START');
  };

  useEffect(() => {
    initBricks();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let reqId: number;

    const draw = (time: number) => {
      reqId = requestAnimationFrame(draw);

      if (isPaused || gameState === 'START' || gameState === 'GAMEOVER') {
        state.current.lastTime = time;
        render(ctx);
        return;
      }

      let dt = (time - state.current.lastTime) / 1000;
      if (dt > 0.1) dt = 0.1; // clamp delta
      state.current.lastTime = time;

      update(dt);
      render(ctx);
    };

    const update = (dt: number) => {
      const s = state.current;
      
      // Move Ball
      s.ballX += s.dx * dt;
      s.ballY += s.dy * dt;

      // Wall collision
      if (s.ballX + s.dx * dt > WIDTH - BALL_R || s.ballX + s.dx * dt < BALL_R) {
        s.dx = -s.dx;
        audio.playBounce();
      }
      if (s.ballY + s.dy * dt < BALL_R) {
        s.dy = -s.dy;
        audio.playBounce();
      } else if (s.ballY + s.dy * dt > HEIGHT - BALL_R) {
        setGameState('GAMEOVER');
        audio.playHit();
        saveHighScore(score);
        return;
      }

      // Paddle collision
      if (
        s.ballY + BALL_R > HEIGHT - PADDLE_H - 10 &&
        s.ballX > s.paddleX &&
        s.ballX < s.paddleX + PADDLE_W
      ) {
        s.dy = -Math.abs(s.dy);
        // Add a bit of english based on where it hit the paddle
        s.dx += (s.ballX - (s.paddleX + PADDLE_W/2)) * 3; 
        audio.playBounce();
      }

      // Brick collision
      let allCleared = true;
      for (let b of s.bricks) {
        if (b.status === 1) {
          allCleared = false;
          if (
            s.ballX > b.x && s.ballX < b.x + BRICK_W &&
            s.ballY > b.y && s.ballY < b.y + BRICK_H
          ) {
            s.dy = -s.dy;
            b.status = 0;
            const newScore = score + 10;
            setScore(newScore);
            onScore(newScore);
            audio.playScore();
            // speed up slightly
            s.dy *= 1.02;
            s.dx *= 1.02;
          }
        }
      }

      if (allCleared) {
        initBricks();
        s.ballX = WIDTH / 2;
        s.ballY = HEIGHT - 30;
        s.dx = 150;
        s.dy = -150;
      }
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      const s = state.current;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Draw Bricks
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let b of s.bricks) {
        if (b.status === 1) {
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
          ctx.fillStyle = '#0f172a'; // slate-950
          ctx.fillText(b.label, b.x + BRICK_W/2, b.y + BRICK_H/2);
        }
      }

      // Draw Paddle
      ctx.fillStyle = '#38bdf8'; // sky-400
      ctx.fillRect(s.paddleX, HEIGHT - PADDLE_H - 10, PADDLE_W, PADDLE_H);

      // Draw Ball
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc'; // slate-50
      ctx.fill();
      ctx.closePath();

      // Overlays
      if (gameState === 'START') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('DATA BREAKER', WIDTH/2, HEIGHT/2 - 10);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px monospace';
        ctx.fillText('Click to Start', WIDTH/2, HEIGHT/2 + 10);
      } else if (gameState === 'GAMEOVER') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('GAME OVER', WIDTH/2, HEIGHT/2 - 10);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px monospace';
        ctx.fillText(`Score: ${score}`, WIDTH/2, HEIGHT/2 + 10);
        ctx.fillText('Click to Restart', WIDTH/2, HEIGHT/2 + 25);
      }

      // Score
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${score}`, 10, 15);
    };

    reqId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(reqId);
  }, [isPaused, gameState, score]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING' || isPaused) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const relativeX = e.clientX - rect.left;
      const scaleX = WIDTH / rect.width;
      let newX = (relativeX * scaleX) - PADDLE_W / 2;
      if (newX < 0) newX = 0;
      if (newX + PADDLE_W > WIDTH) newX = WIDTH - PADDLE_W;
      state.current.paddleX = newX;
    }
  };

  const handleClick = () => {
    audio.init();
    if (gameState === 'START') {
      setGameState('PLAYING');
    } else if (gameState === 'GAMEOVER') {
      resetGame();
      setGameState('PLAYING');
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={250}
      className="w-full h-full block"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    />
  );
}
