import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery } from '@tanstack/react-query';
import { useLocalHistory } from './hooks/useLocalHistory';
import type { HistoryItem } from './hooks/useLocalHistory';
import HistorySidebar from './components/HistorySidebar';
import ProgressBar, { type ProgressPhase } from './components/ProgressBar';

import { UploadCloud, CheckCircle2, AlertCircle, RefreshCw, Copy, Download } from 'lucide-react';

type PresetType = 'INVOICE' | 'RECEIPT' | 'CONTRACT' | 'RESUME' | 'CUSTOM';

const PRESETS: PresetType[] = ['INVOICE', 'RECEIPT', 'CONTRACT', 'RESUME', 'CUSTOM'];

const PRESET_FIELDS_MAP: Record<PresetType, string> = {
  INVOICE: 'date, vendor_name, seller_name, invoice_number, items_list, tax_amount, total_amount',
  RECEIPT: 'date, merchant_name, seller_name, payment_method, items_list, tax_amount, total_amount',
  CONTRACT: 'parties_involved, effective_date, expiration_date, governing_law, key_terms',
  RESUME: 'candidate_name, email, phone, skills, experience, education',
  CUSTOM: 'Define your own fields!'
};

function BackgroundPoller({ taskId, addOrUpdateTask }: { taskId: string, addOrUpdateTask: (task: HistoryItem) => void }) {
  const retrievalUrl = import.meta.env.VITE_RETRIEVAL_API_URL;
  useQuery({
    queryKey: ['documentStatus', taskId, 'background'],
    queryFn: async () => {
      const res = await fetch(`${retrievalUrl}/data?task_id=${taskId}`);
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      
      if (data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'CANCELLED') {
        addOrUpdateTask({
          task_id: data.task_id || taskId,
          status: data.status,
          created_at: data.created_at || new Date().toISOString(),
          file_name: data.file_name,
          extracted_data: data.extracted_data
        });
      }
      return data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
        return false;
      }
      return 2500;
    }
  });
  return null;
}

export default function App() {
  const { history, addOrUpdateTask, removeTask, clearHistory } = useLocalHistory();
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('INVOICE');
  const [customFields, setCustomFields] = useState<string>('');
  
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [taskId, setTaskId] = useState<string | null>(null);
  const [historicalTask, setHistoricalTask] = useState<HistoryItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [activeTaskStatus, setActiveTaskStatus] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const checkLimit = useCallback((): boolean => {
    if (history.length >= 4) {
      setToastMessage("limit reached, please remove a document before processing another");
      setTimeout(() => setToastMessage(null), 3000);
      return false;
    }
    return true;
  }, [history.length]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadError(null);
    if (!checkLimit()) return;
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, [checkLimit]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1,
    onDropRejected: (fileRejections) => {
      setUploadError(fileRejections[0].errors[0].message);
    }
  });

  const handleUpload = async () => {
    if (!file) return;
    if (!checkLimit()) return;
    setIsUploading(true);
    setUploadError(null);
    
    try {
      setUploadProgress('Requesting upload URL...');
      const ingestionUrl = import.meta.env.VITE_INGESTION_API_URL;
      
      const fieldsArray = selectedPreset === 'CUSTOM' 
        ? customFields.split(',').map(f => f.trim()).filter(Boolean)
        : PRESET_FIELDS_MAP[selectedPreset].split(',').map(f => f.trim()).filter(Boolean);

      // 1. Send POST /upload
      const uploadRes = await fetch(`${ingestionUrl}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: selectedPreset,
          file_name: file.name,
          file_size_bytes: file.size,
          selected_fields: fieldsArray,
        })
      });
      
      if (!uploadRes.ok) throw new Error('Failed to get upload URL');
      const uploadData = await uploadRes.json();
      
      const { upload_url, task_id } = uploadData;

      // 2. PUT request to S3
      setUploadProgress('Uploading file...');
      const putRes = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      if (!putRes.ok) throw new Error('Failed to upload file to storage');

      // 3. POST /confirm
      setUploadProgress('Confirming upload...');
      const confirmRes = await fetch(`${ingestionUrl}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id })
      });

      if (!confirmRes.ok) throw new Error('Failed to confirm upload');

      setTaskId(task_id);
      addOrUpdateTask({
        task_id,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        file_name: file.name
      });
    } catch (err: any) {
      setUploadError(err.message || 'An error occurred during upload');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleReset = () => {
    setFile(null);
    setTaskId(null);
    setHistoricalTask(null);
    setUploadError(null);
    setUploadProgress('');
    setActiveTaskStatus('');
  };

  const handleSelectHistoricalTask = (task: HistoryItem) => {
    setHistoricalTask(task);
    setTaskId(task.task_id);
    setFile(null);
  };

  let phase: ProgressPhase = 'idle';
  if (isUploading) phase = 'uploading';
  else if (activeTaskStatus === 'PENDING') phase = 'queued';
  else if (activeTaskStatus === 'PROCESSING' || activeTaskStatus === 'EXTRACTING') phase = 'extracting';
  else if (activeTaskStatus === 'COMPLETED') phase = 'completed';
  else if (activeTaskStatus === 'FAILED') phase = 'failed';
  else if (activeTaskStatus === 'CANCELLED') phase = 'cancelled';

  let progressMessage = '';
  if (phase === 'uploading') progressMessage = uploadProgress || 'Uploading to Supabase Storage...';
  else if (phase === 'queued') progressMessage = 'Waiting in Amazon SQS Queue...';
  else if (phase === 'extracting') progressMessage = 'Analyzing document structure with Gemini 2.5 Flash...';
  else if (phase === 'completed') progressMessage = 'JSON Schema Assembled.';
  else if (phase === 'failed') progressMessage = 'Processing failed.';
  else if (phase === 'cancelled') progressMessage = 'Task was cancelled.';

  const isRunning = phase !== 'idle' && phase !== 'completed' && phase !== 'failed' && phase !== 'cancelled';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans relative">
      
      {/* Background Task Pollers */}
      {history
        .filter(t => t.status === 'PENDING' || t.status === 'PROCESSING' || t.status === 'EXTRACTING')
        .map(t => (
          <BackgroundPoller key={t.task_id} taskId={t.task_id} addOrUpdateTask={addOrUpdateTask} />
        ))}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-red-700 text-red-200 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0 order-2 lg:order-1 flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
          <HistorySidebar history={history} clearHistory={clearHistory} removeTask={removeTask} onSelectTask={handleSelectHistoricalTask} />
          <p className="text-xs text-slate-500 text-center px-4">
            <span className="font-medium text-slate-400">Privacy first:</span> Up to 4 processed documents are saved locally in your browser. Server-side records are permanently purged after 4 hours.
          </p>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full max-w-4xl min-w-0 flex flex-col transition-all duration-300 order-1 lg:order-2">
          <header className="text-center mb-8 relative flex flex-col items-center">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-500 flex items-center justify-center gap-3 mb-2">
              <img src="/favicon.svg" alt="DocProcc Logo" className="w-8 h-8" />
              DocProcc
            </h1>
            <p className="text-slate-400 text-sm">Intelligent Serverless Document Extraction</p>
            
            {taskId && (
              <div className="mt-3">
                <span className="px-3 py-1 bg-sky-900/50 text-sky-200 rounded-full text-sm font-medium border border-sky-800">
                  Task ID: {taskId.slice(0, 8)}...
                </span>
              </div>
            )}
          </header>

          {(!historicalTask && phase !== 'idle' && (!taskId || isRunning || phase === 'completed' || phase === 'failed' || phase === 'cancelled')) && (
            <div className="mb-6">
              <ProgressBar phase={phase} subMessage={progressMessage} />
            </div>
          )}

          {!taskId ? (
            !isUploading && (
              <div className="bg-slate-900 p-6 rounded-xl shadow-xl border border-slate-800 space-y-6">
            
            {/* Presets */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300 text-center">Document Type</label>
              <div className="flex flex-wrap justify-center gap-2">
                {PRESETS.map((preset) => (
                  <div key={preset} className="relative group">
                    <button
                      onClick={() => setSelectedPreset(preset)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedPreset === preset 
                          ? 'bg-sky-500 text-white' 
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max max-w-xs z-10">
                      <div className="bg-slate-950 text-slate-200 text-xs rounded-lg py-2 px-3 shadow-xl border border-slate-800">
                        {preset !== 'CUSTOM' && <span className="block font-semibold text-slate-400 mb-1">Expected Fields:</span>}
                        <p className="whitespace-pre-wrap">{PRESET_FIELDS_MAP[preset]}</p>
                      </div>
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-950 border-b border-r border-slate-800 rotate-45 -mt-1"></div>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedPreset === 'CUSTOM' && (
                <div className="mt-4">
                  <label className="block text-sm text-slate-400 mb-1 text-center">Custom Fields (comma separated)</label>
                  <input 
                    type="text" 
                    value={customFields}
                    onChange={(e) => setCustomFields(e.target.value)}
                    placeholder="e.g. company_name, total_amount, date"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-sky-500 text-center"
                  />
                </div>
              )}
            </div>

            {/* Dropzone */}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 hover:border-gray-500 bg-slate-900/50'
              }`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              {file ? (
                <p className="text-lg font-medium text-sky-400">{file.name}</p>
              ) : (
                <p className="text-slate-400">Drag & drop a PDF here, or click to select</p>
              )}
              <p className="text-xs text-slate-500 mt-2">Max size: 10MB</p>
            </div>

            {uploadError && (
              <div className="p-4 bg-red-900/50 border border-red-700 text-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{uploadError}</p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {uploadProgress || 'Uploading...'}
                </>
              ) : (
                'Process Document'
              )}
            </button>
          </div>
          )
        ) : (
          <ResultViewer taskId={taskId} historicalTask={historicalTask} onReset={handleReset} addOrUpdateTask={addOrUpdateTask} setActiveTaskStatus={setActiveTaskStatus} />
        )}
      </div>
    </div>
    </div>
  );
}

function ResultViewer({ taskId, historicalTask, onReset, addOrUpdateTask, setActiveTaskStatus }: { taskId: string, historicalTask: HistoryItem | null, onReset: () => void, addOrUpdateTask: (task: HistoryItem) => void, setActiveTaskStatus: (s: string) => void }) {
  const retrievalUrl = import.meta.env.VITE_RETRIEVAL_API_URL;

  const { data: fetchedData, error } = useQuery({
    queryKey: ['documentStatus', taskId],
    queryFn: async () => {
      const res = await fetch(`${retrievalUrl}/data?task_id=${taskId}`);
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json();
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
        return false;
      }
      return 2500;
    },
    enabled: !historicalTask,
  });

  const data = historicalTask || fetchedData;

  const status = data?.status || 'PENDING';

  useEffect(() => {
    setActiveTaskStatus(status);
  }, [status, setActiveTaskStatus]);

  useEffect(() => {
    if (!historicalTask && data && (data.status === 'COMPLETED' || data.status === 'FAILED')) {
      addOrUpdateTask({
        task_id: data.task_id || taskId,
        status: data.status,
        created_at: data.created_at || new Date().toISOString(),
        file_name: data.file_name,
        extracted_data: data.extracted_data
      });
    }
  }, [data, taskId, addOrUpdateTask, historicalTask]);

  const isProcessing = status === 'PENDING' || status === 'PROCESSING' || status === 'EXTRACTING';

  const handleCancelTask = async () => {
    try {
      const ingestionUrl = import.meta.env.VITE_INGESTION_API_URL;
      await fetch(`${ingestionUrl}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId })
      });
    } catch (e) {
      console.error('Failed to cancel task', e);
    }
  };
  
  const getStatusDisplay = () => {
    switch(status) {
      case 'PENDING': return { text: 'Pending', color: 'text-slate-400', icon: RefreshCw, spin: true };
      case 'PROCESSING': return { text: 'Processing', color: 'text-sky-400', icon: RefreshCw, spin: true };
      case 'EXTRACTING': return { text: 'Extracting', color: 'text-yellow-400', icon: RefreshCw, spin: true };
      case 'COMPLETED': return { text: 'Completed', color: 'text-green-400', icon: CheckCircle2, spin: false };
      case 'FAILED': return { text: 'Failed', color: 'text-red-400', icon: AlertCircle, spin: false };
      case 'CANCELLED': return { text: 'Cancelled', color: 'text-slate-500', icon: AlertCircle, spin: false };
      default: return { text: status, color: 'text-slate-400', icon: RefreshCw, spin: true };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  const [showCopied, setShowCopied] = useState(false);

  const handleCopy = () => {
    if (data?.extracted_data) {
      navigator.clipboard.writeText(JSON.stringify(data.extracted_data, null, 2));
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (data?.extracted_data) {
      const blob = new Blob([JSON.stringify(data.extracted_data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `docprocc-extraction-${taskId || Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="bg-slate-900 p-6 rounded-xl shadow-xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-6 h-6 ${statusDisplay.color} ${statusDisplay.spin ? 'animate-spin' : ''}`} />
          <div>
            <h2 className="font-medium text-lg">Status: <span className={statusDisplay.color}>{statusDisplay.text}</span></h2>
            <p className="text-sm text-slate-500 font-mono">Task ID: {taskId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing && (
            <button
              onClick={handleCancelTask}
              className="px-4 py-2 bg-red-900/50 hover:bg-red-900/80 text-red-200 border border-red-800 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel Processing
            </button>
          )}
          <button
            onClick={onReset}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isProcessing 
                ? 'bg-slate-900 text-slate-500 cursor-not-allowed border border-slate-800' 
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            Process Another
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 text-red-200 rounded-lg">
          Error polling status: {(error as Error).message}
        </div>
      )}

      {status === 'COMPLETED' && data?.extracted_data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Key-Value Card View */}
          <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="font-medium">Extracted Data</h3>
            </div>
            <div className="p-6 space-y-4">
              {Object.entries(data.extracted_data).map(([key, value]) => (
                <div key={key} className="border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                  <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{key}</span>
                  <span className="text-slate-200">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* JSON Tree View */}
          <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between rounded-t-xl">
              <h3 className="font-medium">Raw JSON</h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleDownload}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Download JSON"
                >
                  <Download className="w-4 h-4" />
                </button>
                <div className="relative flex items-center">
                  <button 
                    onClick={handleCopy}
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Copy JSON"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {showCopied && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-slate-200 text-xs rounded shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 whitespace-nowrap border border-slate-700 pointer-events-none z-50">
                      Copied to clipboard!
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-[#0b1120] rounded-b-xl">
              <pre className="text-sm font-mono text-sky-300 whitespace-pre-wrap">
                <code>{JSON.stringify(data.extracted_data, null, 2)}</code>
              </pre>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
