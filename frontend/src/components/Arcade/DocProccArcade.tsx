import { useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Trophy } from 'lucide-react';
import { useEffect } from 'react';
import { useHighScore } from './utils/useHighScore';
import DataBreaker from './games/DataBreaker';
import PacketDefender from './games/PacketDefender';
import ByteFlap from './games/ByteFlap';

const GAMES = [
  { id: 'data-breaker', title: 'Data Breaker' },
  { id: 'packet-defender', title: 'Packet Defender' },
  { id: 'byte-flap', title: 'Byte Flap' }
];

export default function DocProccArcade() {
  const [activeGameIdx, setActiveGameIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const activeGame = GAMES[activeGameIdx];
  const { getHighScore } = useHighScore(activeGame.id);

  useEffect(() => {
    setHighScore(getHighScore());
  }, [activeGame.id]);

  const handlePrev = () => {
    setActiveGameIdx((prev) => (prev === 0 ? GAMES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveGameIdx((prev) => (prev === GAMES.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="w-80 h-[250px] bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col font-mono relative mt-6">
      
      {/* Header */}
      <div className="h-10 bg-slate-800 border-b-2 border-slate-700 flex items-center justify-between px-2 shrink-0">
        <button onClick={handlePrev} className="text-slate-400 hover:text-white transition-colors p-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center justify-center -mt-0.5">
          <span className="text-[10px] text-sky-400 font-bold uppercase tracking-widest">DocProcc Arcade</span>
          <span className="text-xs text-slate-200 font-semibold">{activeGame.title}</span>
        </div>

        <button onClick={handleNext} className="text-slate-400 hover:text-white transition-colors p-1">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Sub-Header (Score & Audio) */}
      <div className="h-6 bg-slate-900/50 flex items-center justify-between px-3 shrink-0 border-b border-slate-800 text-[10px]">
        <div className="flex items-center gap-1.5 text-yellow-500 font-bold">
          <Trophy className="w-3 h-3" />
          <span>HI: {highScore}</span>
        </div>
        <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white">
          {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
        </button>
      </div>

      {/* Game Area */}
      <div 
        className="flex-1 relative bg-black cursor-crosshair overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Render Active Game */}
        {activeGame.id === 'data-breaker' && <DataBreaker isPaused={!isHovered} isMuted={isMuted} onScore={(s) => setHighScore(Math.max(s, highScore))} />}
        {activeGame.id === 'packet-defender' && <PacketDefender isPaused={!isHovered} isMuted={isMuted} onScore={(s) => setHighScore(Math.max(s, highScore))} />}
        {activeGame.id === 'byte-flap' && <ByteFlap isPaused={!isHovered} isMuted={isMuted} onScore={(s) => setHighScore(Math.max(s, highScore))} />}
        
        {/* Pause Overlay */}
        {!isHovered && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center animate-pulse">
              <span className="text-sky-400 font-bold text-sm tracking-widest block mb-1">PAUSED</span>
              <span className="text-slate-300 text-[10px] uppercase">Hover to Resume</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
