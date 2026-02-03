
import { GeneratedFile } from '../types';
import { generateIcon } from '../services/geminiService';

declare const JSZip: any;

// Placeholder icons (base64 encoded purple PNGs) to ensure the extension loads without errors if no icon is provided.
const ICON_16_B64 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFElEQVR42mNkWL7/n4ECgAYGNQDPfAUEcrG0lAAAAABJRU5ErkJggg==";
const ICON_48_B64 = "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAFklEQVR42u3WIQEAAAgDoP+81BDBIINAQIBAgAABAgQIECDwZQEBAQEBAAAAAAASAN21AAE4OEDvAAAAAElFTkSuQmCC";
const ICON_128_B64 = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAF0lEQVR42u3BAQEAAACCIP+vbkhAAQECBAgQIECAAAECfyBAQEBAQEAAAACgGgHXPwABe8aJsAAAAABJRU5ErkJggg==";

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.bmp'];

/**
 * Checks if a filename represents an image based on extension.
 */
const isImageFile = (filename: string): boolean => {
    const lower = filename.toLowerCase();
    return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
};

/**
 * Resizes an image file to a specific size using a canvas.
 * @param file The image file to resize.
 * @param size The target width and height.
 * @returns A promise that resolves with the base64-encoded PNG data (without the data URL prefix).
 */
const resizeImage = (file: File, size: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(image, 0, 0, size, size);
        // Get base64 string and remove the data URL prefix
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      image.onerror = reject;
      image.src = readerEvent.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Converts a base64 string to a File object.
 * @param base64 The base64 encoded string.
 * @param filename The desired filename.
 * @param mimeType The MIME type of the file.
 * @returns A File object.
 */
const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
};


/**
 * Creates a zip file from an array of file objects and triggers a download.
 * @param files An array of objects, where each object has a 'name' and 'content'.
 * @param iconFile An optional user-uploaded image file for the extension icon.
 * @param zipName The desired name for the downloaded zip file (without .zip).
 * @param iconGenerationPrompt An optional prompt to generate an icon if none is provided.
 * @param additionalFiles Optional array of user-uploaded files to include in the zip.
 */
export const createZip = async (files: GeneratedFile[], iconFile: File | null, zipName: string, iconGenerationPrompt?: string, additionalFiles?: File[]): Promise<void> => {
 try {
    if (typeof JSZip === 'undefined') {
        throw new Error('JSZip kütüphanesi yüklenemedi.');
    }
    if (!files || files.length === 0) {
        throw new Error('Zip oluşturmak için hiçbir dosya sağlanmadı.');
    }

    const zip = new JSZip();

    // Add user-uploaded additional files first.
    // They might be overwritten by AI-generated files with the same name, which is the desired behavior.
    if (additionalFiles && additionalFiles.length > 0) {
        for (const userFile of additionalFiles) {
            zip.file(userFile.name, userFile);
        }
    }

    // Handle SheetJS library injection
    const sheetJsFile = files.find(file => file.name.includes('xlsx.full.min.js'));
    if (sheetJsFile) {
        try {
            const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
            if (!response.ok) {
                throw new Error(`CDN'den SheetJS alınamadı: ${response.statusText}`);
            }
            const libraryContent = await response.text();
            sheetJsFile.content = libraryContent;
        } catch (e) {
            console.error("SheetJS kütüphanesi indirilemedi:", e);
            const errorMessage = e instanceof Error ? e.message : "Bilinmeyen ağ hatası";
            const errorContent = `/*\n  HATA: SheetJS kütüphanesi otomatik olarak indirilemedi.\n  Lütfen bu dosyanın içeriğini manuel olarak https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js adresinden indirip yapıştırın.\n  Hata detayı: ${errorMessage}\n*/`;
            sheetJsFile.content = errorContent;
        }
    }


    let manifestContent: string | null = null;
    const manifestFile = files.find(file => file.name === 'manifest.json');

    if (manifestFile && manifestFile.content) {
        manifestContent = manifestFile.content;
    } else {
        // If distinct manifest not found, try searching in list
        // but we generally expect it.
    }
    
    // Helper to update manifest with a standard icons entry.
    const updateManifestForIcons = (manifestJSON: string): string => {
        try {
            const manifest = JSON.parse(manifestJSON);
            manifest.icons = {
                "16": "icons/icon16.png",
                "48": "icons/icon48.png",
                "128": "icons/icon128.png"
            };
            return JSON.stringify(manifest, null, 2);
        } catch (e) {
            console.error("manifest.json ayrıştırılamadı, ikonlar eklenemiyor.", e);
            // If manifest is broken, return it as is.
            return manifestJSON;
        }
    };

    // Icon handling logic
    let iconsAdded = false;

    // 1. Prioritize user-uploaded icon
    if (iconFile) {
        const [icon16, icon48, icon128] = await Promise.all([
            resizeImage(iconFile, 16),
            resizeImage(iconFile, 48),
            resizeImage(iconFile, 128),
        ]);
        
        zip.folder('icons');
        zip.file('icons/icon16.png', icon16, { base64: true });
        zip.file('icons/icon48.png', icon48, { base64: true });
        zip.file('icons/icon128.png', icon128, { base64: true });
        
        if (manifestContent) manifestContent = updateManifestForIcons(manifestContent);
        iconsAdded = true;
    }
    // 2. If no user icon, try to generate one
    else if (iconGenerationPrompt) {
        try {
            console.log("İkon yüklenmedi, yapay zeka ile üretiliyor...");
            const generatedBase64 = await generateIcon(iconGenerationPrompt);
            const generatedIconFile = base64ToFile(generatedBase64, 'generated_icon.png', 'image/png');
            
            const [icon16, icon48, icon128] = await Promise.all([
                resizeImage(generatedIconFile, 16),
                resizeImage(generatedIconFile, 48),
                resizeImage(generatedIconFile, 128),
            ]);
            
            zip.folder('icons');
            zip.file('icons/icon16.png', icon16, { base64: true });
            zip.file('icons/icon48.png', icon48, { base64: true });
            zip.file('icons/icon128.png', icon128, { base64: true });

            if (manifestContent) manifestContent = updateManifestForIcons(manifestContent);
            iconsAdded = true;
        } catch (generationError) {
            console.error("Yapay zeka ile ikon üretimi başarısız, yer tutuculara dönülüyor.", generationError);
        }
    }
    
    // 3. If no icons were added (e.g., no user icon, no prompt, or AI failed) AND the original manifest doesn't have an icons entry, add placeholders.
    if (manifestContent && !iconsAdded && !manifestContent.includes('"icons":')) {
        zip.folder('icons');
        zip.file('icons/icon16.png', ICON_16_B64, { base64: true });
        zip.file('icons/icon48.png', ICON_48_B64, { base64: true });
        zip.file('icons/icon128.png', ICON_128_B64, { base64: true });
        zip.file(
          'icons/README.md',
          'Bu klasördeki ikonlar yer tutucudur. Eklentinizi yayınlamadan önce bunları kendi 16x16, 48x48 ve 128x128 piksel PNG resimlerinizle değiştirmeniz önerilir.'
        );
        manifestContent = updateManifestForIcons(manifestContent);
    }

    files.forEach(file => {
        if (typeof file.name !== 'string' || typeof file.content !== 'string') {
            throw new Error(`Geçersiz dosya nesnesi bulundu: ${JSON.stringify(file)}`);
        }
        // Handle folder structure
        const pathParts = file.name.split('/');
        let currentFolder = zip;
        for (let i = 0; i < pathParts.length - 1; i++) {
            currentFolder = currentFolder.folder(pathParts[i])!;
        }

        if (file.name === 'manifest.json' && manifestContent) {
            currentFolder.file(pathParts[pathParts.length - 1], manifestContent);
        } else {
             // Check if it's an image file to determine if content is base64 or string
             const isImage = isImageFile(file.name);
             currentFolder.file(pathParts[pathParts.length - 1], file.content, { base64: isImage });
        }
    });

    const blob = await zip.generateAsync({ type: 'blob' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${zipName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
 } catch (error) {
    console.error("Zip oluşturma sırasında kritik hata:", error);
    if (error instanceof Error) {
        throw new Error(error.message);
    }
    throw new Error("Bilinmeyen bir zip oluşturma hatası oluştu.");
 }
};


/**
 * Reads the content of a zip file in the browser.
 * @param zipFile The .zip file to read.
 * @returns A promise that resolves with an array of GeneratedFile objects.
 */
export const readZip = async (zipFile: File): Promise<GeneratedFile[]> => {
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip kütüphanesi yüklenemedi.');
  }

  const zip = await JSZip.loadAsync(zipFile);
  const files: GeneratedFile[] = [];

  const filePromises = Object.keys(zip.files).map(async (filename) => {
    const file = zip.files[filename];
    // Skip directories
    if (!file.dir) {
      let content: string;
      if (isImageFile(filename)) {
          content = await file.async('base64');
      } else {
          content = await file.async('string');
      }
      
      files.push({
        name: filename,
        content: content,
      });
    }
  });

  await Promise.all(filePromises);

  if (files.length === 0) {
      throw new Error("Bu zip dosyası boş veya okunabilir dosya içermiyor.");
  }

  return files;
};

/**
 * Reads user-provided files and returns their content.
 * @param files An array of File objects.
 * @returns A promise resolving to an array of objects containing file info.
 */
export const readUserFiles = (files: File[]): Promise<{ name: string; content: string; isBinary: boolean }[]> => {
  const filePromises = files.map(file => {
    return new Promise<{ name: string; content: string; isBinary: boolean }>((resolve, reject) => {
      const reader = new FileReader();
      const isBinary = !file.type.startsWith('text/') && 
                       !file.type.includes('json') && 
                       !file.type.includes('javascript') &&
                       !file.type.includes('csv') &&
                       !file.type.includes('xml');
      
      reader.onload = () => {
        let content: string = reader.result as string;
        if (isBinary) {
          // For binary files, get base64 string and remove data URL prefix
          content = content.split(',')[1];
        }
        resolve({ name: file.name, content, isBinary });
      };
      reader.onerror = reject;

      if (isBinary) {
        reader.readAsDataURL(file); // Reads as base64
      } else {
        reader.readAsText(file);
      }
    });
  });
  return Promise.all(filePromises);
};
