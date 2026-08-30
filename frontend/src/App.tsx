import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery } from '@tanstack/react-query';
import { useLocalHistory } from './hooks/useLocalHistory';
import type { HistoryItem } from './hooks/useLocalHistory';
import HistorySidebar from './components/HistorySidebar';

import { UploadCloud, FileText, CheckCircle2, AlertCircle, RefreshCw, Copy } from 'lucide-react';

type PresetType = 'INVOICE' | 'RECEIPT' | 'CONTRACT' | 'RESUME' | 'CUSTOM';

const PRESETS: PresetType[] = ['INVOICE', 'RECEIPT', 'CONTRACT', 'RESUME', 'CUSTOM'];

const PRESET_FIELDS_MAP: Record<PresetType, string> = {
  INVOICE: 'date, vendor_name, seller_name, invoice_number, items_list, tax_amount, total_amount',
  RECEIPT: 'date, merchant_name, seller_name, payment_method, items_list, tax_amount, total_amount',
  CONTRACT: 'parties_involved, effective_date, expiration_date, governing_law, key_terms',
  RESUME: 'candidate_name, email, phone, skills, experience, education',
  CUSTOM: 'Define your own fields!'
};

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
        : [];

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
    setCustomFields('');
    setSelectedPreset('INVOICE');
  };

  const handleSelectHistoricalTask = (task: HistoryItem) => {
    setHistoricalTask(task);
    setTaskId(task.task_id);
    setFile(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-red-700 text-red-200 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0 order-2 lg:order-1 flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
          <HistorySidebar history={history} clearHistory={clearHistory} removeTask={removeTask} onSelectTask={handleSelectHistoricalTask} />
          <p className="text-xs text-gray-500 text-center px-4">
            <span className="font-medium text-gray-400">Privacy first:</span> Up to 4 processed documents are saved locally in your browser. Server-side records are permanently purged after 4 hours.
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-8 order-1 lg:order-2">
          <header className="text-center">
            <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              <FileText className="w-8 h-8 text-blue-400" />
              DocProcc
            </h1>
            <p className="text-gray-400">Intelligent Document Processing</p>
          </header>

          {!taskId ? (
            <div className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700 space-y-6">
            
            {/* Presets */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300 text-center">Document Type</label>
              <div className="flex flex-wrap justify-center gap-2">
                {PRESETS.map((preset) => (
                  <div key={preset} className="relative group">
                    <button
                      onClick={() => setSelectedPreset(preset)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedPreset === preset 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {preset}
                    </button>
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max max-w-xs z-10">
                      <div className="bg-gray-900 text-gray-200 text-xs rounded-lg py-2 px-3 shadow-xl border border-gray-700">
                        {preset !== 'CUSTOM' && <span className="block font-semibold text-gray-400 mb-1">Expected Fields:</span>}
                        <p className="whitespace-pre-wrap">{PRESET_FIELDS_MAP[preset]}</p>
                      </div>
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-gray-900 border-b border-r border-gray-700 rotate-45 -mt-1"></div>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedPreset === 'CUSTOM' && (
                <div className="mt-4">
                  <label className="block text-sm text-gray-400 mb-1 text-center">Custom Fields (comma separated)</label>
                  <input 
                    type="text" 
                    value={customFields}
                    onChange={(e) => setCustomFields(e.target.value)}
                    placeholder="e.g. company_name, total_amount, date"
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 text-center"
                  />
                </div>
              )}
            </div>

            {/* Dropzone */}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
              }`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              {file ? (
                <p className="text-lg font-medium text-blue-400">{file.name}</p>
              ) : (
                <p className="text-gray-400">Drag & drop a PDF here, or click to select</p>
              )}
              <p className="text-xs text-gray-500 mt-2">Max size: 10MB</p>
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
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
        ) : (
          <ResultViewer taskId={taskId} historicalTask={historicalTask} onReset={handleReset} addOrUpdateTask={addOrUpdateTask} />
        )}
      </div>
    </div>
    </div>
  );
}

function ResultViewer({ taskId, historicalTask, onReset, addOrUpdateTask }: { taskId: string, historicalTask: HistoryItem | null, onReset: () => void, addOrUpdateTask: (task: HistoryItem) => void }) {
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
      case 'PENDING': return { text: 'Pending', color: 'text-gray-400', icon: RefreshCw, spin: true };
      case 'PROCESSING': return { text: 'Processing', color: 'text-blue-400', icon: RefreshCw, spin: true };
      case 'EXTRACTING': return { text: 'Extracting', color: 'text-yellow-400', icon: RefreshCw, spin: true };
      case 'COMPLETED': return { text: 'Completed', color: 'text-green-400', icon: CheckCircle2, spin: false };
      case 'FAILED': return { text: 'Failed', color: 'text-red-400', icon: AlertCircle, spin: false };
      case 'CANCELLED': return { text: 'Cancelled', color: 'text-gray-500', icon: AlertCircle, spin: false };
      default: return { text: status, color: 'text-gray-400', icon: RefreshCw, spin: true };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  const handleCopy = () => {
    if (data?.extracted_data) {
      navigator.clipboard.writeText(JSON.stringify(data.extracted_data, null, 2));
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-6 h-6 ${statusDisplay.color} ${statusDisplay.spin ? 'animate-spin' : ''}`} />
          <div>
            <h2 className="font-medium text-lg">Status: <span className={statusDisplay.color}>{statusDisplay.text}</span></h2>
            <p className="text-sm text-gray-500 font-mono">Task ID: {taskId}</p>
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
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
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
          <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700 bg-gray-900/50">
              <h3 className="font-medium">Extracted Data</h3>
            </div>
            <div className="p-6 space-y-4">
              {Object.entries(data.extracted_data).map(([key, value]) => (
                <div key={key} className="border-b border-gray-700/50 pb-2 last:border-0 last:pb-0">
                  <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{key}</span>
                  <span className="text-gray-200">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* JSON Tree View */}
          <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-700 bg-gray-900/50 flex items-center justify-between">
              <h3 className="font-medium">Raw JSON</h3>
              <button 
                onClick={handleCopy}
                className="text-gray-400 hover:text-white transition-colors"
                title="Copy JSON"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-[#1e1e1e]">
              <pre className="text-sm font-mono text-blue-300 whitespace-pre-wrap">
                <code>{JSON.stringify(data.extracted_data, null, 2)}</code>
              </pre>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
