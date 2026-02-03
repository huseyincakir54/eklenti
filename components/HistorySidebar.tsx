import React from 'react';
import { HistoryItem } from '../types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDownload: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => void;
}

const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const LoadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 7.414V13a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;

const HistorySidebar: React.FC<HistorySidebarProps> = ({ isOpen, onToggle, history, onLoad, onDownload, onDelete, selectedIds, onToggleSelection, onToggleSelectAll, onDeleteSelected }) => {
  
  const allSelected = history.length > 0 && selectedIds.size === history.length;
  const anySelected = selectedIds.size > 0;

  return (
    <>
        <button 
            onClick={onToggle}
            className={`fixed top-1/2 -translate-y-1/2 z-30 p-2 bg-gray-700/80 backdrop-blur-sm text-white rounded-l-md transition-all duration-500 ease-in-out hover:bg-purple-600 ${isOpen ? 'right-[384px]' : 'right-0'}`}
            aria-label="Geçmişi aç/kapat"
        >
            <HistoryIcon />
        </button>

        <aside className={`fixed top-0 right-0 h-full w-96 bg-gray-800/80 backdrop-blur-sm border-l border-gray-700 shadow-2xl z-20 transform transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-4 border-b border-gray-600">
                    <h2 className="text-xl font-semibold text-white">Eklenti Geçmişi</h2>
                    <button onClick={onToggle} className="text-gray-400 hover:text-white">
                        <CloseIcon />
                    </button>
                </div>
                
                {history.length > 0 && (
                  <div className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-900/50">
                      <div className="flex items-center space-x-2">
                          <input
                              type="checkbox"
                              className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-purple-500 focus:ring-purple-600 cursor-pointer"
                              checked={allSelected}
                              onChange={onToggleSelectAll}
                              title={allSelected ? "Tümünün seçimini kaldır" : "Tümünü seç"}
                          />
                          <label className="text-sm text-gray-300 select-none">
                              {anySelected ? `${selectedIds.size} seçildi` : "Tümünü Seç"}
                          </label>
                      </div>
                      <button 
                          onClick={onDeleteSelected} 
                          disabled={!anySelected}
                          className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                          title="Seçilenleri Sil"
                      >
                          <DeleteIcon />
                          <span className="ml-1.5 hidden sm:inline">Sil</span>
                      </button>
                  </div>
                )}

                <div className="flex-grow overflow-y-auto p-2">
                    {history.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-center text-gray-500 px-4">
                            <p>Henüz bir eklenti oluşturmadınız. Oluşturduğunuzda burada görünecektir.</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {history.map(item => (
                                <li key={item.id} className={`rounded-lg p-3 transition-colors group ${selectedIds.has(item.id) ? 'bg-purple-900/40' : 'bg-gray-700/50 hover:bg-gray-700/80'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start space-x-3 flex-grow min-w-0">
                                            <input
                                                type="checkbox"
                                                className="mt-1 h-4 w-4 rounded bg-gray-600 border-gray-500 text-purple-500 focus:ring-purple-600 cursor-pointer shrink-0"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => onToggleSelection(item.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-200 truncate pr-2" title={item.name}>{item.name}</p>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(item.timestamp).toLocaleString('tr-TR')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-1 shrink-0">
                                            <button onClick={() => onLoad(item)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded" title="Yükle & Düzenle"><LoadIcon /></button>
                                            <button onClick={() => onDownload(item)} className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-600 rounded" title="İndir"><DownloadIcon /></button>
                                            <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onDelete(item.id);
                                                }} 
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-600 rounded" 
                                                title="Sil"
                                            >
                                                <DeleteIcon />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </aside>
    </>
  );
};

export default HistorySidebar;
