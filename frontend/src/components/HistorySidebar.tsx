import { useState } from 'react';
import type { HistoryItem } from '../hooks/useLocalHistory';
import { CheckCircle2, AlertCircle, Trash2, X, RefreshCw } from 'lucide-react';

interface HistorySidebarProps {
  history: HistoryItem[];
  clearHistory: () => void;
  removeTask: (taskId: string) => void;
  onSelectTask: (task: HistoryItem) => void;
}

export default function HistorySidebar({ history, clearHistory, removeTask, onSelectTask }: HistorySidebarProps) {
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'all' | 'single', taskId?: string } | null>(null);

  const handleConfirmDelete = () => {
    if (confirmDelete?.type === 'all') {
      clearHistory();
    } else if (confirmDelete?.type === 'single' && confirmDelete.taskId) {
      removeTask(confirmDelete.taskId);
    }
    setConfirmDelete(null);
  };

  if (history.length === 0) {
    return (
      <div className="bg-slate-900 p-4 rounded-xl shadow-xl border border-slate-800 space-y-4">
        <h3 className="font-medium text-slate-300 border-b border-slate-800 pb-2">Recent Documents</h3>
        <p className="text-sm text-slate-500 text-center py-4">No recent documents found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-900 p-4 rounded-xl shadow-xl border border-slate-800 space-y-4 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="font-medium text-slate-300">Recent Documents</h3>
          <button 
            onClick={() => setConfirmDelete({ type: 'all' })}
            className="text-slate-500 hover:text-red-400 transition-colors p-1"
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
                className="w-full text-left bg-slate-950 hover:bg-slate-800 transition-colors p-3 rounded-lg border border-slate-800 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-slate-200 truncate pr-6" title={item.file_name}>
                    {item.file_name || 'Unknown Document'}
                  </span>
                  {item.status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  ) : item.status === 'FAILED' ? (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-sky-400 shrink-0 mt-0.5 animate-spin" />
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono truncate max-w-[150px]">
                    {item.task_id.split('-')[0]}...
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete({ type: 'single', taskId: item.task_id });
                }}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm border border-transparent hover:border-slate-700"
                title="Delete Document"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-200 mb-2">Are you sure?</h3>
            <p className="text-sm text-slate-400 mb-6">
              {confirmDelete.type === 'all' 
                ? "This will permanently delete all documents from your history." 
                : "This will permanently delete this document from your history."}
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-lg shadow-red-900/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
