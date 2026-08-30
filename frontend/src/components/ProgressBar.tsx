import { UploadCloud, Server, Sparkles, CheckCircle2, XCircle } from 'lucide-react';

export type ProgressPhase = 'idle' | 'uploading' | 'queued' | 'extracting' | 'completed' | 'failed' | 'cancelled';

interface ProgressBarProps {
  phase: ProgressPhase;
  subMessage: string;
}

export default function ProgressBar({ phase, subMessage }: ProgressBarProps) {
  const getProgressWidth = () => {
    switch (phase) {
      case 'idle': return '0%';
      case 'uploading': return '25%';
      case 'queued': return '50%';
      case 'extracting': return '75%';
      case 'completed': return '100%';
      case 'failed':
      case 'cancelled': return '100%';
      default: return '0%';
    }
  };

  const getBarColor = () => {
    if (phase === 'failed') return 'bg-red-500';
    if (phase === 'cancelled') return 'bg-slate-600';
    if (phase === 'completed') return 'bg-green-500';
    return 'bg-sky-500';
  };

  const isPulsing = phase === 'extracting';

  const steps = [
    { id: 'uploading', label: 'Upload', Icon: UploadCloud },
    { id: 'queued', label: 'Queue', Icon: Server },
    { id: 'extracting', label: 'Extract', Icon: Sparkles },
    { id: 'completed', label: 'Ready', Icon: CheckCircle2 }
  ];

  const getStepStatus = (stepId: string) => {
    const phases = ['uploading', 'queued', 'extracting', 'completed'];
    const currentIdx = phases.indexOf(phase);
    const stepIdx = phases.indexOf(stepId);
    
    if (phase === 'failed' || phase === 'cancelled') {
        return stepIdx <= phases.indexOf(phase === 'cancelled' ? 'queued' : 'extracting') ? 'done' : 'pending';
    }

    if (currentIdx === -1) return 'pending';
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="bg-slate-900 p-6 rounded-xl shadow-xl border border-slate-800 w-full animate-in fade-in duration-300">
      <div className="flex justify-between mb-8 relative px-4">
        {/* Track Background */}
        <div className="absolute top-5 left-8 right-8 h-1 bg-slate-800 -z-10 rounded-full"></div>
        
        {/* Active Track */}
        <div 
          className={`absolute top-5 left-8 h-1 -z-10 rounded-full transition-all duration-700 ease-in-out ${getBarColor()} ${isPulsing ? 'animate-pulse shadow-[0_0_10px_rgba(56,189,248,0.5)]' : ''}`}
          style={{ width: `calc(${getProgressWidth()} - 4rem)` }}
        ></div>

        {/* Steps */}
        {steps.map((step) => {
          const status = getStepStatus(step.id);
          const Icon = step.Icon;
          
          let bgColor = 'bg-slate-800';
          let iconColor = 'text-slate-500';
          let ring = '';
          
          if (status === 'done') {
            bgColor = phase === 'failed' ? 'bg-red-500/20' : (phase === 'cancelled' ? 'bg-slate-600/20' : 'bg-sky-500/20');
            iconColor = phase === 'failed' ? 'text-red-400' : (phase === 'cancelled' ? 'text-slate-400' : 'text-sky-400');
          } else if (status === 'active') {
            bgColor = 'bg-sky-500';
            iconColor = 'text-white';
            ring = 'ring-4 ring-sky-900/50';
          }

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-900 px-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${bgColor} ${iconColor} ${ring}`}>
                {phase === 'failed' && step.id === 'extracting' ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span className={`text-xs font-medium ${status === 'active' ? 'text-slate-200' : 'text-slate-500'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="text-center mt-4">
        <p className={`text-sm font-medium transition-colors duration-300 ${
            phase === 'failed' ? 'text-red-400' : 
            phase === 'cancelled' ? 'text-slate-400' : 
            phase === 'completed' ? 'text-green-400' : 'text-sky-400'
        }`}>
          {subMessage}
        </p>
      </div>
    </div>
  );
}
