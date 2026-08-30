import type { HistoryItem } from '../hooks/useLocalHistory';
import { CheckCircle2, AlertCircle, Clock, Trash2, X } from 'lucide-react';

interface HistorySidebarProps {
  history: HistoryItem[];
  clearHistory: () => void;
  removeTask: (taskId: string) => void;
  onSelectTask: (task: HistoryItem) => void;
}

export default function HistorySidebar({ history, clearHistory, removeTask, onSelectTask }: HistorySidebarProps) {

  if (history.length === 0) {
    return (
      <div className="bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-700 space-y-4">
        <h3 className="font-medium text-gray-300 border-b border-gray-700 pb-2">Recent Documents</h3>
        <p className="text-sm text-gray-500 text-center py-4">No recent documents found.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-700 space-y-4 flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-700 pb-2">
        <h3 className="font-medium text-gray-300">Recent Documents</h3>
        <button 
          onClick={clearHistory}
          className="text-gray-500 hover:text-red-400 transition-colors p-1"
          title="Clear History"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-3">
        {history.map((item) => (
          <div key={item.task_id} className="relative group">
            <button
              onClick={() => onSelectTask(item)}
              className="w-full text-left bg-gray-900 hover:bg-gray-700 transition-colors p-3 rounded-lg border border-gray-700 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-gray-200 truncate pr-6" title={item.file_name}>
                  {item.file_name || 'Unknown Document'}
                </span>
                {item.status === 'COMPLETED' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                ) : item.status === 'FAILED' ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-mono truncate max-w-[150px]">
                  {item.task_id.split('-')[0]}...
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTask(item.task_id);
              }}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-gray-800 hover:bg-gray-700 rounded-md shadow-sm border border-transparent hover:border-gray-600"
              title="Delete Document"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
