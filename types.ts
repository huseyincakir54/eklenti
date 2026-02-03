
export interface GeneratedFile {
  name: string;
  content: string;
}

export interface HistoryItem {
  id: string;
  name: string;
  timestamp: string;
  files: GeneratedFile[];
  analysis: string | null;
}
