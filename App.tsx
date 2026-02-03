
import React, { useState, useCallback, useEffect } from 'react';
import { GeneratedFile, HistoryItem } from './types';
import { generateExtension, analyzeExtension } from './services/geminiService';
import { createZip, readZip, readUserFiles } from './utils/fileUtils';
import { saveHistory, loadHistory } from './utils/storage';
import Header from './components/Header';
import PromptInput from './components/PromptInput';
import ResultDisplay from './components/ResultDisplay';
import Loader from './components/Loader';
import HistorySidebar from './components/HistorySidebar';
import Chatbot from './components/Chatbot';

// Basit bir UUID v4 oluşturucu
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [isThinkingMode, setIsThinkingMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[] | null>(null);
  const [uploadedIcon, setUploadedIcon] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [refineStatus, setRefineStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const addOrUpdateHistory = (files: GeneratedFile[], summary: string | null) => {
    const manifestFile = files.find(f => f.name === 'manifest.json');
    let extensionName = 'İsimsiz Eklenti';
    if (manifestFile) {
        try {
            const manifest = JSON.parse(manifestFile.content);
            extensionName = manifest.name || extensionName;
        } catch (e) {
            console.error("Manifest dosyası ayrıştırılamadı:", e);
        }
    }

    const newHistoryItem: HistoryItem = {
      id: uuidv4(), // Güvenilir silme işlemi için UUID kullanılıyor
      name: extensionName,
      timestamp: new Date().toISOString(),
      files,
      analysis: summary,
    };
    setHistory(prev => [newHistoryItem, ...prev]);
    setIsHistoryOpen(true);
  };


  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Lütfen eklentiniz için bir açıklama girin.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedFiles(null);
    setAnalysis(null);
    setRefineStatus(null); 

    try {
      const additionalFilesData = await readUserFiles(additionalFiles);
      const files = await generateExtension(prompt, isThinkingMode, null, additionalFilesData);
      setGeneratedFiles(files);
      const newAnalysis = await analyzeExtension(files);
      setAnalysis(newAnalysis);
      addOrUpdateHistory(files, newAnalysis);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu. Lütfen konsolu kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, isThinkingMode, additionalFiles]);

  const handleRefine = useCallback(async () => {
    if (!editPrompt.trim()) {
      setRefineStatus({ type: 'error', message: 'Lütfen bir düzenleme açıklaması girin.' });
      return;
    }
    if (!generatedFiles) return;
  
    setIsLoading(true);
    setError(null);
    setRefineStatus(null);
    
    try {
      // 1. Token limitini aşmamak için büyük/ikili dosyaları yapay zekaya göndermeden ayır.
      const filesToRefine: GeneratedFile[] = [];
      const untouchedFiles: GeneratedFile[] = [];
  
      for (const file of generatedFiles) {
        const isBinary = /\.(png|jpg|jpeg|gif|svg|ico|xlsx|zip|webp|bmp)$/i.test(file.name);
        // 80k karakter limiti, büyük JS kütüphaneleri gibi dosyaları hariç tutar
        if (isBinary || file.content.length > 80000) {
          untouchedFiles.push(file);
        } else {
          filesToRefine.push(file);
        }
      }
  
      const additionalFilesData = await readUserFiles(additionalFiles);
      const newOrUpdatedFiles = await generateExtension(editPrompt, isThinkingMode, filesToRefine, additionalFilesData);
  
      // 2. Sonuçları birleştir. Yapay zekadan gelen yanıt, dokunulmayan dosyaların üzerine yazabilir.
      const finalFilesMap = new Map<string, GeneratedFile>();
      // Önce yapay zekaya gönderilmeyen dosyaları ekle.
      untouchedFiles.forEach(file => finalFilesMap.set(file.name, file));
      // Sonra yapay zekanın yanıtını ekle. Bu, gerekirse dokunulmayan dosyaların üzerine yazar.
      newOrUpdatedFiles.forEach(file => finalFilesMap.set(file.name, file));
  
      const finalFiles = Array.from(finalFilesMap.values());
      
      const newAnalysis = await analyzeExtension(finalFiles);
      setGeneratedFiles(finalFiles);
      setEditPrompt(''); 
      setRefineStatus({ type: 'success', message: 'Değişiklikler başarıyla uygulandı!' });
      addOrUpdateHistory(finalFiles, newAnalysis);
      setTimeout(() => setRefineStatus(null), 5000);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu. Lütfen konsolu kontrol edin.';
      setRefineStatus({ type: 'error', message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [editPrompt, isThinkingMode, generatedFiles, additionalFiles]);

  const handleZipUpload = useCallback(async (zipFile: File) => {
    setIsAnalyzing(true);
    setError(null);
    setGeneratedFiles(null);
    setAnalysis(null);
    setPrompt('');
    setUploadedIcon(null);
    setAdditionalFiles([]);
    setRefineStatus(null); 

    try {
      const files = await readZip(zipFile);
      setGeneratedFiles(files);
      
      const summary = await analyzeExtension(files);
      setAnalysis(summary);
      addOrUpdateHistory(files, summary);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? `Zip dosyası işlenemedi: ${err.message}` : 'Zip dosyası işlenirken bilinmeyen bir hata oluştu.');
      setGeneratedFiles(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);
  
  const handleFileUpdate = useCallback((fileName: string, newContent: string) => {
      if (!generatedFiles) return;
      const updatedFiles = generatedFiles.map(f => 
          f.name === fileName ? { ...f, content: newContent } : f
      );
      setGeneratedFiles(updatedFiles);
  }, [generatedFiles]);

  const handleDownload = useCallback(async (filesToDownload: GeneratedFile[] = generatedFiles!) => {
    if (!filesToDownload) return;
    const iconPrompt = analysis || prompt;
    try {
      await createZip(filesToDownload, uploadedIcon, 'chrome-eklentisi', iconPrompt, additionalFiles);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? `Zip dosyası oluşturulamadı: ${err.message}` : 'Zip dosyası oluşturulamadı.');
    }
  }, [generatedFiles, uploadedIcon, prompt, analysis, additionalFiles]);

  const handleDownloadFromHistory = useCallback(async (item: HistoryItem) => {
    const iconPrompt = item.analysis || item.name;
    try {
      // Pass null for uploadedIcon as it's not relevant for history items
      await createZip(item.files, null, 'chrome-eklentisi', iconPrompt);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? `Zip dosyası oluşturulamadı: ${err.message}` : 'Zip dosyası oluşturulamadı.');
    }
  }, []);

  const handleLoadFromHistory = (item: HistoryItem) => {
    setGeneratedFiles(item.files);
    setAnalysis(item.analysis);
    setPrompt('');
    setEditPrompt('');
    setAdditionalFiles([]);
    setError(null);
    setRefineStatus(null);
    setIsHistoryOpen(false); // Close sidebar after loading
    setSelectedHistoryIds(new Set()); // Clear selection
  };
  
  const handleToggleHistorySelection = (id: string) => {
    setSelectedHistoryIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return newSet;
    });
  };

  const handleToggleSelectAllHistory = () => {
      setSelectedHistoryIds(prev => {
          if (prev.size === history.length) {
              return new Set();
          } else {
              return new Set(history.map(item => item.id));
          }
      });
  };

  const handleDeleteHistoryItem = (idToDelete: string) => {
    const updatedHistory = history.filter(item => item.id !== idToDelete);
    setHistory(updatedHistory);
    const updatedSelectedIds = new Set(selectedHistoryIds);
    updatedSelectedIds.delete(idToDelete);
    setSelectedHistoryIds(updatedSelectedIds);
  };

  const handleDeleteSelectedHistory = () => {
    if (selectedHistoryIds.size === 0) return;
    const updatedHistory = history.filter(item => !selectedHistoryIds.has(item.id));
    setHistory(updatedHistory);
    setSelectedHistoryIds(new Set());
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex items-start p-4 sm:p-6 lg:p-8 relative overflow-x-hidden">
      <div className={`w-full max-w-4xl mx-auto transition-all duration-500 ${isHistoryOpen ? 'lg:mr-[384px]' : 'mr-0'}`}>
        <Header />
        <main className="mt-8">
          <PromptInput
            prompt={prompt}
            setPrompt={setPrompt}
            isThinkingMode={isThinkingMode}
            setIsThinkingMode={setIsThinkingMode}
            onGenerate={handleGenerate}
            isLoading={isLoading || isAnalyzing}
            uploadedIcon={uploadedIcon}
            setUploadedIcon={setUploadedIcon}
            onZipUpload={handleZipUpload}
            additionalFiles={additionalFiles}
            setAdditionalFiles={setAdditionalFiles}
          />
          
          {isLoading && <Loader />}

          {isAnalyzing && (
            <div className="mt-8 flex flex-col items-center justify-center text-center p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
              <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-lg text-gray-300 font-medium">Eklenti analiz ediliyor...</p>
              <p className="mt-1 text-sm text-gray-500">Dosyalar okunuyor ve yapay zeka bir özet hazırlıyor.</p>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
              <div className="flex">
                <div className="py-1">
                  <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1zm1-4a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H10a1 1 0 0 1-1-1z"/></svg>
                </div>
                <div>
                  <p className="font-bold text-red-200">Bir şeyler ters gitti</p>
                  <p className="text-sm text-red-300 whitespace-pre-wrap">{error}</p>
                </div>
              </div>
            </div>
          )}

          {generatedFiles && (
            <ResultDisplay 
              files={generatedFiles} 
              onDownload={() => handleDownload(generatedFiles)}
              editPrompt={editPrompt}
              setEditPrompt={setEditPrompt}
              onRefine={handleRefine}
              isLoading={isLoading || isAnalyzing}
              analysis={analysis}
              refineStatus={refineStatus}
              setRefineStatus={setRefineStatus}
              onUpdateFile={handleFileUpdate}
            />
          )}
        </main>
      </div>

       <HistorySidebar 
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
            history={history}
            onLoad={handleLoadFromHistory}
            onDownload={handleDownloadFromHistory}
            onDelete={handleDeleteHistoryItem}
            selectedIds={selectedHistoryIds}
            onToggleSelection={handleToggleHistorySelection}
            onToggleSelectAll={handleToggleSelectAllHistory}
            onDeleteSelected={handleDeleteSelectedHistory}
        />

        <Chatbot files={generatedFiles} />
    </div>
  );
};

export default App;
