import { HistoryItem } from '../types';

const HISTORY_KEY = 'chromeExtensionWizardHistory';

export function saveHistory(history: HistoryItem[]): void {
  try {
    const serializedHistory = JSON.stringify(history);
    localStorage.setItem(HISTORY_KEY, serializedHistory);
  } catch (error) {
    console.error("Geçmiş kaydedilemedi:", error);
  }
}

export function loadHistory(): HistoryItem[] {
  try {
    const serializedHistory = localStorage.getItem(HISTORY_KEY);
    if (serializedHistory === null) {
      return [];
    }
    const history = JSON.parse(serializedHistory);
    // Basit bir doğrulama
    if (Array.isArray(history)) {
        return history;
    }
    return [];
  } catch (error) {
    console.error("Geçmiş yüklenemedi:", error);
    return [];
  }
}
