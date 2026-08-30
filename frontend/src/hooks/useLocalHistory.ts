import { useState, useCallback } from 'react';

export interface HistoryItem {
  task_id: string;
  status: string;
  created_at: string;
  file_name?: string;
  extracted_data?: any;
}

const STORAGE_KEY = 'docprocc_history';
const MAX_HISTORY_ITEMS = 4;

export function useLocalHistory() {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('Error reading localStorage', error);
      return [];
    }
  });

  const addOrUpdateTask = useCallback((task: HistoryItem) => {
    setHistory((prev) => {
      // Check if task already exists
      const existsIndex = prev.findIndex((t) => t.task_id === task.task_id);
      let newHistory;
      if (existsIndex >= 0) {
        newHistory = [...prev];
        newHistory[existsIndex] = task;
      } else {
        newHistory = [task, ...prev];
      }
      newHistory = newHistory.slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setHistory((prev) => {
      const newHistory = prev.filter(t => t.task_id !== taskId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    history,
    addOrUpdateTask,
    removeTask,
    clearHistory
  };
}
