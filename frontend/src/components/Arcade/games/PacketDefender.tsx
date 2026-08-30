import { useEffect, useRef, useState } from 'react';
import { useRetroAudio } from '../utils/useRetroAudio';
import { useHighScore } from '../utils/useHighScore';

interface Props {
  isPaused: boolean;
  isMuted: boolean;
  onScore: (score: number) => void;
}

export default function PacketDefender({ isPaused, isMuted, onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  
  const audio = useRetroAudio(isMuted);
  const { saveHighScore } = useHighScore('packet-defender');

  const WIDTH = 320;
  const HEIGHT = 250;
  
  const state = useRef({
    mouseX: WIDTH / 2,
    mouseY: HEIGHT / 2,
    packets: [] as {x: number, y: number, speed: number, size: number, type: string, hp: number, maxHp: number}[],
    particles: [] as {x: number, y: number, vx: number, vy: number, life: number, maxLife: number, color: string}[],
    projectiles: [] as {x: number, y: number, vx: number, vy: number}[],
    spawnTimer: 0,
    spawnRate: 1.5,
    shotCooldown: 0,
    lastTime: 0
  });

  const resetGame = () => {
    state.current.packets = [];
    state.current.particles = [];
    state.current.projectiles = [];
    state.current.spawnTimer = 0;
    state.current.spawnRate = 1.5;
    setScore(0);
    setGameState('START');
  };

  const getPacketColor = (hp: number) => {
    if (hp === 3) return '#ef4444'; // red-500
    if (hp === 2) return '#f97316'; // orange-500
    return '#f472b6'; // pink-400
  };

  const spawnExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 16; i++) {
      state.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100,
        life: 0.3,
        maxLife: 0.3,
        color
      });
    }
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
      if (s.shotCooldown > 0) s.shotCooldown -= dt;

      // Spawn packets
      s.spawnTimer += dt;
      if (s.spawnTimer > s.spawnRate) {
        s.spawnTimer = 0;
        s.spawnRate = Math.max(0.4, s.spawnRate * 0.98); // get faster
        
        const types = ['{JSON}', '<XML>', 'PDF', 'CSV'];
        const hp = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        
        s.packets.push({
          x: Math.random() * (WIDTH - 40) + 20,
          y: -20,
          speed: Math.random() * 20 + 20, // 20-40 px/s (slightly slower since they are tanky)
          size: 16 + (hp * 4), // 20, 24, 28
          type: types[Math.floor(Math.random() * types.length)],
          hp,
          maxHp: hp
        });
      }

      // Update projectiles
      for (let i = s.projectiles.length - 1; i >= 0; i--) {
        const proj = s.projectiles[i];
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        
        // Remove if off-screen
        if (proj.x < 0 || proj.x > WIDTH || proj.y < 0 || proj.y > HEIGHT) {
          s.projectiles.splice(i, 1);
          continue;
        }

        // Collision with packets
        let hit = false;
        for (let j = s.packets.length - 1; j >= 0; j--) {
          const p = s.packets[j];
          if (
            proj.x >= p.x - p.size/2 && proj.x <= p.x + p.size/2 &&
            proj.y >= p.y - p.size/2 && proj.y <= p.y + p.size/2
          ) {
            p.hp -= 1;
            hit = true;
            if (p.hp <= 0) {
              spawnExplosion(p.x, p.y, getPacketColor(p.maxHp));
              s.packets.splice(j, 1);
              const newScore = score + (p.maxHp * 10);
              setScore(newScore);
              onScore(newScore);
              audio.playShatter();
            } else {
              // Just a hit sound and tiny particle pop
              audio.playHit();
              s.particles.push({ x: proj.x, y: proj.y, vx: 0, vy: -50, life: 0.1, maxLife: 0.1, color: '#fff' });
            }
            break;
          }
        }
        
        if (hit) {
          s.projectiles.splice(i, 1);
        }
      }

      // Update packets
      for (let i = s.packets.length - 1; i >= 0; i--) {
        const p = s.packets[i];
        p.y += p.speed * dt;
        if (p.y > HEIGHT) {
          setGameState('GAMEOVER');
          audio.playHit();
          saveHighScore(score);
          return;
        }
      }

      // Update particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) s.particles.splice(i, 1);
      }
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      const s = state.current;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Draw Grid (retro feel)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      for (let i = 0; i < WIDTH; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, HEIGHT); ctx.stroke(); }
      for (let i = 0; i < HEIGHT; i += 20) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(WIDTH, i); ctx.stroke(); }

      // Draw Turret Base
      ctx.fillStyle = '#38bdf8'; // sky-400
      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT, 15, Math.PI, 0);
      ctx.fill();
      
      // Draw Turret Barrel
      const angle = Math.atan2(s.mouseY - HEIGHT, s.mouseX - (WIDTH / 2));
      ctx.save();
      ctx.translate(WIDTH / 2, HEIGHT);
      ctx.rotate(angle);
      ctx.fillStyle = '#7dd3fc'; // sky-300
      ctx.fillRect(0, -4, 25, 8);
      ctx.restore();

      // Draw Projectiles
      ctx.fillStyle = '#38bdf8';
      for (let proj of s.projectiles) {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Packets
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '8px monospace';
      for (let p of s.packets) {
        ctx.fillStyle = getPacketColor(p.hp);
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        ctx.fillStyle = '#0f172a';
        ctx.fillText(p.type, p.x, p.y - 2);
        
        // Draw HP dots
        ctx.fillStyle = '#fff';
        for (let h = 0; h < p.hp; h++) {
          ctx.fillRect(p.x - (p.hp * 3)/2 + (h * 3) + 1, p.y + p.size/2 - 4, 1.5, 1.5);
        }
      }

      // Draw Particles
      for (let p of s.particles) {
        ctx.fillStyle = p.color;
        const a = p.life / p.maxLife;
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); // integer coordinates
      }
      ctx.globalAlpha = 1;

      // Overlays
      if (gameState === 'START') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('PACKET DEFENDER', WIDTH/2, HEIGHT/2 - 10);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px monospace';
        ctx.fillText('Click to Start', WIDTH/2, HEIGHT/2 + 10);
      } else if (gameState === 'GAMEOVER') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('BREACH DETECTED', WIDTH/2, HEIGHT/2 - 10);
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
    if (isPaused) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const scaleX = WIDTH / rect.width;
      const scaleY = HEIGHT / rect.height;
      state.current.mouseX = (e.clientX - rect.left) * scaleX;
      state.current.mouseY = (e.clientY - rect.top) * scaleY;
    }
  };

  const handleClick = () => {
    audio.init();
    if (gameState === 'START') {
      setGameState('PLAYING');
      return;
    }
    if (gameState === 'GAMEOVER') {
      resetGame();
      setGameState('PLAYING');
      return;
    }
    
    if (isPaused) return;
    
    const s = state.current;
    if (s.shotCooldown > 0) return;
    s.shotCooldown = 0.5;

    // Fire projectile!
    const angle = Math.atan2(s.mouseY - HEIGHT, s.mouseX - (WIDTH / 2));
    const speed = 400; // px/sec
    
    s.projectiles.push({ 
      x: WIDTH / 2, 
      y: HEIGHT, 
      vx: Math.cos(angle) * speed, 
      vy: Math.sin(angle) * speed 
    });
    
    audio.playLaser();
  };

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={250}
      className="w-full h-full block cursor-crosshair"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    />
  );
}
