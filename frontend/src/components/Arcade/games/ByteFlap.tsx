import { useEffect, useRef, useState } from 'react';
import { useRetroAudio } from '../utils/useRetroAudio';
import { useHighScore } from '../utils/useHighScore';

interface Props {
  isPaused: boolean;
  isMuted: boolean;
  onScore: (score: number) => void;
}

export default function ByteFlap({ isPaused, isMuted, onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  
  const audio = useRetroAudio(isMuted);
  const { saveHighScore } = useHighScore('byte-flap');

  const WIDTH = 320;
  const HEIGHT = 250;
  
  const GRAVITY = 800; // px/s^2
  const FLAP_VELOCITY = -250; // px/s
  const PIPE_SPEED = 120; // px/s
  const PIPE_WIDTH = 40;
  const PIPE_GAP = 75;
  const BIRD_RADIUS = 8;
  
  const state = useRef({
    birdY: HEIGHT / 2,
    birdVelocity: 0,
    pipes: [] as {x: number, topHeight: number, passed: boolean}[],
    spawnTimer: 0,
    lastTime: 0
  });

  const resetGame = () => {
    state.current.birdY = HEIGHT / 2;
    state.current.birdVelocity = 0;
    state.current.pipes = [];
    state.current.spawnTimer = 0;
    setScore(0);
    setGameState('START');
  };

  const spawnPipe = () => {
    const minHeight = 20;
    const maxHeight = HEIGHT - PIPE_GAP - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    state.current.pipes.push({ x: WIDTH, topHeight, passed: false });
  };

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
      if (dt > 0.1) dt = 0.1;
      state.current.lastTime = time;

      update(dt);
      render(ctx);
    };

    const update = (dt: number) => {
      const s = state.current;

      // Bird physics
      s.birdVelocity += GRAVITY * dt;
      s.birdY += s.birdVelocity * dt;

      // Pipe spawning
      s.spawnTimer += dt;
      if (s.spawnTimer > 1.8) {
        s.spawnTimer = 0;
        spawnPipe();
      }

      // Update pipes
      for (let i = s.pipes.length - 1; i >= 0; i--) {
        const p = s.pipes[i];
        p.x -= PIPE_SPEED * dt;

        // Score
        if (!p.passed && p.x + PIPE_WIDTH < WIDTH / 3) {
          p.passed = true;
          const newScore = score + 1;
          setScore(newScore);
          onScore(newScore);
          audio.playScore();
        }

        // Remove offscreen
        if (p.x + PIPE_WIDTH < 0) {
          s.pipes.splice(i, 1);
        }
      }

      // Collisions
      // 1. Floor/Ceiling
      if (s.birdY + BIRD_RADIUS > HEIGHT || s.birdY - BIRD_RADIUS < 0) {
        setGameState('GAMEOVER');
        audio.playHit();
        saveHighScore(score);
        return;
      }

      // 2. Pipes (Circle to AABB)
      const birdX = WIDTH / 3;
      for (let p of s.pipes) {
        // Top pipe
        let testX = birdX;
        let testY = s.birdY;
        if (birdX < p.x) testX = p.x;
        else if (birdX > p.x + PIPE_WIDTH) testX = p.x + PIPE_WIDTH;
        if (s.birdY > p.topHeight) testY = p.topHeight;
        let distX = birdX - testX;
        let distY = s.birdY - testY;
        if ((distX*distX) + (distY*distY) <= BIRD_RADIUS*BIRD_RADIUS) {
          setGameState('GAMEOVER');
          audio.playHit();
          saveHighScore(score);
          return;
        }

        // Bottom pipe
        testX = birdX;
        testY = s.birdY;
        const bottomY = p.topHeight + PIPE_GAP;
        if (birdX < p.x) testX = p.x;
        else if (birdX > p.x + PIPE_WIDTH) testX = p.x + PIPE_WIDTH;
        if (s.birdY < bottomY) testY = bottomY;
        distX = birdX - testX;
        distY = s.birdY - testY;
        if ((distX*distX) + (distY*distY) <= BIRD_RADIUS*BIRD_RADIUS) {
          setGameState('GAMEOVER');
          audio.playHit();
          saveHighScore(score);
          return;
        }
      }
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      const s = state.current;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Pipes
      ctx.fillStyle = '#34d399'; // emerald-400
      for (let p of s.pipes) {
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        ctx.fillRect(p.x, p.topHeight + PIPE_GAP, PIPE_WIDTH, HEIGHT - (p.topHeight + PIPE_GAP));
        
        // Pipe caps
        ctx.fillStyle = '#059669'; // emerald-600
        ctx.fillRect(p.x - 2, p.topHeight - 10, PIPE_WIDTH + 4, 10);
        ctx.fillRect(p.x - 2, p.topHeight + PIPE_GAP, PIPE_WIDTH + 4, 10);
        ctx.fillStyle = '#34d399';
      }

      // Bird
      ctx.beginPath();
      ctx.arc(WIDTH / 3, s.birdY, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24'; // amber-400
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#d97706'; // amber-600
      ctx.stroke();

      // Wing
      ctx.beginPath();
      ctx.arc(WIDTH / 3 - 2, s.birdY, BIRD_RADIUS/2, 0, Math.PI);
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      // Overlays
      if (gameState === 'START') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BYTE FLAP', WIDTH/2, HEIGHT/2 - 10);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px monospace';
        ctx.fillText('Click to Flap', WIDTH/2, HEIGHT/2 + 10);
      } else if (gameState === 'GAMEOVER') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CRASHED', WIDTH/2, HEIGHT/2 - 10);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px monospace';
        ctx.fillText(`Score: ${score}`, WIDTH/2, HEIGHT/2 + 10);
        ctx.fillText('Click to Restart', WIDTH/2, HEIGHT/2 + 25);
      }

      // Score
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${score}`, WIDTH/2, 25);
    };

    reqId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(reqId);
  }, [isPaused, gameState, score]);

  const handleClick = () => {
    audio.init();
    if (gameState === 'START') {
      setGameState('PLAYING');
      state.current.birdVelocity = FLAP_VELOCITY;
      audio.playBounce();
      return;
    }
    if (gameState === 'GAMEOVER') {
      resetGame();
      setGameState('PLAYING');
      state.current.birdVelocity = FLAP_VELOCITY;
      audio.playBounce();
      return;
    }
    
    if (isPaused) return;

    state.current.birdVelocity = FLAP_VELOCITY;
    audio.playBounce();
  };

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={250}
      className="w-full h-full block cursor-pointer"
      onMouseDown={handleClick}
    />
  );
}
