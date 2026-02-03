
import React, { useState, useMemo, useRef } from 'react';
import { GeneratedFile } from '../types';

interface ResultDisplayProps {
  files: GeneratedFile[];
  onDownload: () => void;
  editPrompt: string;
  setEditPrompt: (prompt: string) => void;
  onRefine: () => void;
  isLoading: boolean;
  analysis?: string | null;
  refineStatus: { type: 'success' | 'error'; message: string } | null;
  setRefineStatus: (status: { type: 'success' | 'error'; message: string } | null) => void;
  onUpdateFile: (fileName: string, newContent: string) => void;
}

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 7.414V13a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
);

const EditIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
);

const ImageIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
    </svg>
);


const ResultDisplay: React.FC<ResultDisplayProps> = ({ files, onDownload, editPrompt, setEditPrompt, onRefine, isLoading, analysis, refineStatus, setRefineStatus, onUpdateFile }) => {
  const [activeTab, setActiveTab] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewContent = useMemo(() => {
    // 1. Kök dizini ve manifest dosyasını bul
    const manifestFile = files.find(f => f.name.endsWith('manifest.json'));
    let rootPath = '';
    
    if (manifestFile) {
        const parts = manifestFile.name.split('/');
        if (parts.length > 1) {
            // manifest.json bir klasör içindeyse, o klasörü kök olarak kabul et
            rootPath = parts.slice(0, -1).join('/') + '/';
        }
    }

    // 2. Popup HTML dosyasını belirle
    let htmlFile: GeneratedFile | undefined;

    // Önce manifest içinden popup yolunu okumayı dene
    if (manifestFile) {
        try {
            const manifest = JSON.parse(manifestFile.content);
            const action = manifest.action || manifest.browser_action;
            let popupPath = action?.default_popup;
            
            if (popupPath && typeof popupPath === 'string') {
                // Başındaki ./ veya / karakterlerini temizle
                popupPath = popupPath.replace(/^\.?\//, '');
                // Kök dizin ile birleştir
                const fullPath = rootPath + popupPath;
                htmlFile = files.find(f => f.name === fullPath);
            }
        } catch (e) {
            console.warn("Manifest okunurken hata oluştu:", e);
        }
    }

    // Eğer manifest'ten bulunamadıysa standart isimleri dene
    if (!htmlFile) {
         // Öncelik sırası: Kök'teki popup.html -> Herhangi bir popup.html -> Kök'teki index.html
         htmlFile = files.find(f => f.name === rootPath + 'popup.html') ||
                    files.find(f => f.name.endsWith('/popup.html')) ||
                    files.find(f => f.name === 'popup.html') ||
                    files.find(f => f.name === rootPath + 'index.html');
         
         // Dosya bulunduysa ve kök dizin henüz belirlenmemişse, dosyanın bulunduğu klasörü kök varsay (tahmini)
         if (htmlFile && !rootPath && htmlFile.name.includes('/')) {
             const parts = htmlFile.name.split('/');
             rootPath = parts.slice(0, -1).join('/') + '/';
         }
    }

    if (!htmlFile) {
      return { available: false, srcDoc: '<div style="color: white; padding: 20px; text-align: center; font-family: sans-serif;">Bu eklentinin önizlenecek bir popup arayüzü (manifest.json içinde tanımlı veya popup.html) bulunamadı.</div>' };
    }

    let htmlContent = htmlFile.content;
    const htmlFileDir = htmlFile.name.includes('/') ? htmlFile.name.substring(0, htmlFile.name.lastIndexOf('/') + 1) : '';

    // Yol çözümleyici fonksiyon
    const resolvePath = (relPath: string): string | null => {
        // Query parametrelerini ve hash'leri temizle
        relPath = relPath.split('?')[0].split('#')[0];
        
        if (relPath.startsWith('http') || relPath.startsWith('data:')) return null; // Harici link

        // Eklenti köküne göre mutlak yol
        if (relPath.startsWith('/')) {
            return rootPath + relPath.substring(1);
        }
        
        // Göreli yol
        const stack = htmlFileDir.split('/').filter(p => p);
        const parts = relPath.split('/');
        
        for (const part of parts) {
            if (part === '.' || part === '') continue;
            if (part === '..') {
                stack.pop();
            } else {
                stack.push(part);
            }
        }
        return stack.join('/');
    };

    // CSS Enjeksiyonu
    htmlContent = htmlContent.replace(/<link[^>]+href\s*=\s*['"]([^'"]+)['"][^>]*>/gi, (match, href) => {
      if (!match.toLowerCase().includes('stylesheet')) return match;
      
      const resolvedPath = resolvePath(href);
      if (!resolvedPath) return match;

      // Tam yol ile eşleşen dosyayı bul
      const cssFile = files.find(f => f.name === resolvedPath);
      if (cssFile) {
        return `<style>/* ${cssFile.name} */\n${cssFile.content}</style>`;
      }
      return match;
    });

    // JS Enjeksiyonu
    const scriptsToInject: string[] = [];
    
    // Script taglarını bul ve içeriklerini topla, tagları HTML'den kaldır
    htmlContent = htmlContent.replace(/<script[^>]+src\s*=\s*['"]([^'"]+)['"][^>]*>\s*<\/script>/gi, (match, src) => {
      const resolvedPath = resolvePath(src);
      if (!resolvedPath) return match;

      const jsFile = files.find(f => f.name === resolvedPath);
      if (jsFile) {
        // Script tagını kapatan stringleri bozmamak için escape et
        const safeContent = jsFile.content.replace(/<\/script/gi, '<\\/script');
        scriptsToInject.push(`<script>\n/* ${jsFile.name} */\n${safeContent}\n</script>`);
        return ''; // Tagı kaldır, en sona ekleyeceğiz
      }
      return match;
    });

    // Scriptleri body kapanışından hemen önceye ekle (sırayı korumak önemli)
    if (htmlContent.includes('</body>')) {
        htmlContent = htmlContent.replace('</body>', scriptsToInject.join('\n') + '</body>');
    } else {
        htmlContent += scriptsToInject.join('\n');
    }

    return { available: true, srcDoc: htmlContent };
  }, [files]);

  const hasPreview = previewContent.available;
  const [activeView, setActiveView] = useState<'files' | 'preview'>(hasPreview ? 'preview' : 'files');


  const handleEditPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditPrompt(e.target.value);
    if (refineStatus) {
      setRefineStatus(null);
    }
  };

  const isImageFile = (fileName: string) => {
    return /\.(png|jpg|jpeg|gif|ico|svg|webp|bmp)$/i.test(fileName);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:image/png;base64,")
          const base64Content = result.split(',')[1];
          onUpdateFile(files[activeTab].name, base64Content);
      };
      reader.readAsDataURL(file);
  };

  const triggerImageUpload = () => {
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
  };


  return (
    <div className="mt-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg animate-fade-in">
      <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-3 sm:mb-0">Eklenti Dosyaları</h2>
        <button
          onClick={onDownload}
          disabled={isLoading}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          <DownloadIcon />
          .zip olarak İndir
        </button>
      </div>

      {analysis && (
        <div className="p-4 sm:p-6 border-b border-gray-700 bg-gray-900/30">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Eklenti Özeti</h3>
            <p className="text-sm text-gray-300 italic">{analysis}</p>
        </div>
      )}
      
      <div>
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-1 sm:space-x-2 px-4 sm:px-6 overflow-x-auto" aria-label="Tabs">
            {hasPreview && (
              <button
                onClick={() => setActiveView('preview')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                  ${activeView === 'preview'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                  }`}
              >
                Önizleme
              </button>
            )}
            {files.map((file, index) => (
              <button
                key={file.name}
                onClick={() => {
                    setActiveView('files');
                    setActiveTab(index);
                }}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                  ${activeView === 'files' && activeTab === index
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                  }`}
              >
                {file.name}
              </button>
            ))}
          </nav>
        </div>

        {activeView === 'preview' ? (
          <div className="p-4 sm:p-6 bg-gray-900/40 flex justify-center items-center min-h-[550px]">
            <div className="w-[380px] h-[500px] bg-white rounded-md shadow-2xl overflow-hidden ring-1 ring-gray-600 flex flex-col">
              <div className="bg-gray-200 text-gray-800 text-sm font-medium p-2 text-center border-b border-gray-300 shrink-0">
                 Eklenti Önizlemesi
              </div>
              <iframe
                title="Eklenti Önizlemesi"
                srcDoc={previewContent.srcDoc}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-forms"
              />
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
             {files[activeTab] && isImageFile(files[activeTab].name) ? (
                 <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-md border border-gray-700">
                     <div className="mb-6 p-4 bg-gray-800/50 rounded-lg shadow-inner">
                        {/* Determine mime type simply based on extension for preview */}
                        <img 
                            src={`data:image/${files[activeTab].name.split('.').pop()};base64,${files[activeTab].content}`} 
                            alt={files[activeTab].name} 
                            className="max-w-full max-h-96 object-contain"
                        />
                     </div>
                     
                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                     />
                     
                     <button 
                        onClick={triggerImageUpload}
                        className="inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                     >
                         <ImageIcon />
                         Resmi Değiştir
                     </button>
                     <p className="mt-2 text-xs text-gray-500">Bu resmi güncelleyerek .zip dosyasına ekleyebilirsiniz.</p>
                 </div>
             ) : (
                <pre className="bg-gray-900 rounded-md p-4 text-sm text-gray-300 overflow-x-auto max-h-96">
                    <code>{files[activeTab]?.content}</code>
                </pre>
             )}
          </div>
        )}
      </div>
      <div className="p-4 sm:p-6 border-t border-gray-700 bg-gray-800/40 rounded-b-xl">
        <h3 className="text-lg font-semibold text-white mb-2">Düzeltme &amp; Düzenleme</h3>
        <p className="text-sm text-gray-400 mb-4">
          Beğenmediğiniz bir şey mi var veya yeni bir özellik mi eklemek istiyorsunuz? Aşağıya yazın ve yapay zekanın kodu sizin için düzenlemesini izleyin.
        </p>
        <textarea
            rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200 placeholder-gray-500"
            placeholder="örneğin, Açılır pencerenin arka plan rengini açık mavi yap."
            value={editPrompt}
            onChange={handleEditPromptChange}
            disabled={isLoading}
        />
        
        {refineStatus && (
            <div className={`mt-3 px-4 py-3 rounded-lg text-sm
            ${refineStatus.type === 'success' 
                ? 'bg-green-900/50 border border-green-700 text-green-300' 
                : 'bg-red-900/50 border border-red-700 text-red-300'
            }`}
            role={refineStatus.type === 'error' ? 'alert' : 'status'}
            >
                <div className="flex">
                    <div className="py-1 shrink-0">
                        {refineStatus.type === 'error' ? (
                             <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1zm1-4a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H10a1 1 0 0 1-1-1z"/></svg>
                        ) : (
                            <svg className="fill-current h-6 w-6 text-green-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
                        )}
                    </div>
                    <div>
                        <p className={`font-bold ${refineStatus.type === 'success' ? 'text-green-200' : 'text-red-200'}`}>
                            {refineStatus.type === 'success' ? 'Başarılı' : 'Hata'}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{refineStatus.message}</p>
                    </div>
                </div>
            </div>
        )}

        <div className="mt-4 flex justify-end">
            <button
                onClick={onRefine}
                disabled={isLoading || !editPrompt.trim()}
                className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300"
            >
                <EditIcon />
                {isLoading ? 'Uygulanıyor...' : 'Değişiklikleri Uygula'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;
