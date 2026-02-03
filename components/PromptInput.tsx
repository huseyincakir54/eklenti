import React, { useState, useEffect, useRef } from 'react';

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  isThinkingMode: boolean;
  setIsThinkingMode: (isThinking: boolean) => void;
  onGenerate: () => void;
  isLoading: boolean;
  uploadedIcon: File | null;
  setUploadedIcon: (file: File | null) => void;
  onZipUpload: (file: File) => void;
  additionalFiles: File[];
  setAdditionalFiles: (files: File[]) => void;
}

const WandIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 2.24 14.074 2.24 16.5c0 2.205 1.794 4 4 4 2.426 0 4.654-1.503 5.589-3.75l.441-1.002.49-.49a.997.997 0 00.042-.01l5.43-1.358a.997.997 0 00.042-.01L19 9.78V8.562a1 1 0 00-2 0v1.22l-1.222.305a.997.997 0 00-.042.01l-5.43 1.358.892-.893c.355-.355.626-.75.832-1.174l1.002-.441C18.497 8.654 20 6.426 20 4c0-2.206-1.795-4-4-4-2.426 0-4.653 1.503-5.589 3.75l-1.002.441-.49.49a.997.997 0 00-.01.042L3.562 9l-1.222-.305A1 1 0 001 9.938V11a1 1 0 102 0V9.78l1.222.305c.014.004.028.007.042.01l5.43 1.358-.893.892c-.355.355-.75.626-1.174.832l-.441 1.002C8.653 16.497 6.426 18 4 18c-1.105 0-2-.895-2-2 0-1.426 1.503-3.654 3.75-5.589l1.002-.441.49-.49a.997.997 0 00.01-.042L11 3.562l.305-1.222A1 1 0 0011.062 1H10a1 1 0 100 2h.062L9 7.438 7.642 2H6a1 1 0 000-2H4.758a1 1 0 00-.948.684L3 1zm10 3a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
      <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.414l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L13 9.414V13h-1.5a1.5 1.5 0 01-3 0H5.5z" />
      <path d="M9 13a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" />
    </svg>
);

const FileIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);

const CloseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);


const PromptInput: React.FC<PromptInputProps> = ({
  prompt,
  setPrompt,
  isThinkingMode,
  setIsThinkingMode,
  onGenerate,
  isLoading,
  uploadedIcon,
  setUploadedIcon,
  onZipUpload,
  additionalFiles,
  setAdditionalFiles
}) => {
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const zipFileInputRef = useRef<HTMLInputElement>(null);
  const additionalFilesInputRef = useRef<HTMLInputElement>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  useEffect(() => {
    if (uploadedIcon) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(uploadedIcon);
    } else {
      setIconPreview(null);
    }
  }, [uploadedIcon]);

  const handleIconFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedIcon(file);
    }
  };
  
  const handleZipFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onZipUpload(file);
      // Clear the input so the same file can be uploaded again
      event.target.value = '';
    }
  };

  const handleAdditionalFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAdditionalFiles([...additionalFiles, ...Array.from(event.target.files)]);
    }
    event.target.value = ''; // Allow re-uploading the same file
  };

  const handleRemoveAdditionalFile = (indexToRemove: number) => {
    setAdditionalFiles(additionalFiles.filter((_, index) => index !== indexToRemove));
  };


  const handleRemoveIcon = () => {
    setUploadedIcon(null);
    if(iconFileInputRef.current) {
        iconFileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-lg">
      <label htmlFor="prompt-input" className="block text-lg font-medium text-gray-300 mb-2">
        1. Yeni bir eklenti oluşturun
      </label>
      <textarea
        id="prompt-input"
        rows={4}
        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200 placeholder-gray-500"
        placeholder="örneğin, Bir sayfadaki tüm resimleri kedi resimleriyle değiştiren bir eklenti."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isLoading}
      />

      <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-4">
            {/* Thinking Mode Toggle */}
        </div>
        <button
          onClick={onGenerate}
          disabled={isLoading || !prompt.trim()}
          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 shrink-0"
        >
          <WandIcon />
          {isLoading ? 'Oluşturuluyor...' : 'Eklenti Oluştur'}
        </button>
      </div>
      
      <div className="mt-6 border-t border-gray-700 pt-6">
        <label className="block text-lg font-medium text-gray-300 mb-2">
          Ek Dosyalar (İsteğe Bağlı)
        </label>
        <p className="text-sm text-gray-400 mb-3">
          Yapay zekanın referans alması için dosyalar yükleyin (örneğin, bir Excel şablonu, metin dosyası, resim vb.).
        </p>
        <div className="flex flex-col gap-3">
            <input
                type="file"
                id="additional-files-upload"
                ref={additionalFilesInputRef}
                className="hidden"
                onChange={handleAdditionalFilesChange}
                disabled={isLoading}
                multiple
            />
            <label htmlFor="additional-files-upload" className={`w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md transition-colors ${isLoading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600 cursor-pointer'}`}>
                <UploadIcon />
                Dosya Ekle
            </label>
            {additionalFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {additionalFiles.map((file, index) => (
                        <div key={index} className="bg-gray-600 text-gray-200 text-xs font-medium px-2.5 py-1.5 rounded-full flex items-center gap-2">
                           <FileIcon />
                            <span>{file.name}</span>
                            <button onClick={() => handleRemoveAdditionalFile(index)} disabled={isLoading} className="text-gray-400 hover:text-white disabled:opacity-50">
                                <CloseIcon />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>


      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-600"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-800/80 px-2 text-sm text-gray-400">Veya</span>
        </div>
      </div>
      
      <div>
        <label className="block text-lg font-medium text-gray-300 mb-2">
          2. Mevcut eklentiyi yükleyin ve düzenleyin
        </label>
        <div className="mt-2 flex flex-col sm:flex-row items-center gap-4">
            <input
                type="file"
                id="zip-upload"
                ref={zipFileInputRef}
                className="hidden"
                accept=".zip"
                onChange={handleZipFileChange}
                disabled={isLoading}
            />
            <label htmlFor="zip-upload" className={`w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md transition-colors ${isLoading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600 cursor-pointer'}`}>
                <UploadIcon />
                Zip Yükle &amp; Düzenle
            </label>
            <p className="text-sm text-gray-500 text-center sm:text-left">Daha önce oluşturulmuş bir eklenti .zip dosyasını yükleyerek üzerinde değişiklik yapın.</p>
        </div>
      </div>


      <div className="mt-6 border-t border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-gray-300">Ayarlar &amp; Seçenekler</h3>
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => !isLoading && setIsThinkingMode(!isThinkingMode)}>
                    <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isThinkingMode ? 'bg-purple-600' : 'bg-gray-600'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isThinkingMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-gray-300 select-none">
                        Düşünme Modu
                        <span className="text-xs text-gray-400 ml-1">(Daha Zeki, Daha Yavaş)</span>
                    </span>
                </div>
                 {iconPreview ? (
                    <div className="flex items-center space-x-2">
                        <img src={iconPreview} alt="Icon preview" className="h-10 w-10 rounded-md object-cover"/>
                        <button onClick={handleRemoveIcon} disabled={isLoading} className="text-gray-400 hover:text-white transition-colors text-xs disabled:opacity-50">Kaldır</button>
                    </div>
                 ) : (
                    <>
                        <input
                            type="file"
                            id="icon-upload"
                            ref={iconFileInputRef}
                            className="hidden"
                            accept="image/png, image/jpeg"
                            onChange={handleIconFileChange}
                            disabled={isLoading}
                        />
                        <label htmlFor="icon-upload" className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md transition-colors ${isLoading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600 cursor-pointer'}`}>
                            <UploadIcon />
                            İkon Yükle (İsteğe Bağlı)
                        </label>
                    </>
                 )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default PromptInput;