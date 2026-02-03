
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeneratedFile } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: "Tam dosya adı, örn: 'manifest.json', 'popup.js', 'styles.css', 'libs/xlsx.full.min.js'.",
        },
        content: {
          type: Type.STRING,
          description: "Dosyanın tam kaynak kodu veya içeriği.",
        },
      },
      required: ["name", "content"],
    },
};

const commonRules = `1. Tüm yanıtın, dosya nesnelerinden oluşan geçerli bir JSON dizisi OLMALIDIR.
2. Her dosya nesnesinin iki anahtarı olmalıdır: 'name' ve 'content'.
3. Üretilen 'manifest.json' dosyası Manifest V3 kullanmalıdır.
4. **EXCEL/XLSX KURALLARI:** Eklenti 'sheetjs' (xlsx.full.min.js) kütüphanesini yerel olarak kullanmalıdır.
5. JSON yapısının kendisi dışında hiçbir yorum veya markdown biçimlendirmesi ekleme. Yanıt ham JSON olmalı.
6. **KARAKTER KODLAMASI:** Tüm dosya içerikleri doğrudan Türkçe karakter içermelidir (UTF-8). &ccedil; gibi entity'ler KULLANMA.
7. **VERİ KAZIMA (SCRAPING):** Kullanıcı breadcrumb veya hiyerarşik yapılar (örn: 'Adres Breadcrumb') istiyorsa, DOM içindeki ilgili elementleri döngüye alarak metinleri birleştirme mantığını (join) en verimli şekilde kur.`;

const systemInstruction = `Sen dünya standartlarında bir Google Chrome eklentisi geliştirici yapay zekasısın. 
${commonRules}
11. Gerekli tüm dosyaların dahil edildiğinden emin ol: 'manifest.json' zorunludur.`;

const editSystemInstruction = `Sen, mevcut bir Google Chrome eklentisini değiştiren uzman bir yapay zeka geliştiricisisin. 

**KRİTİK DÜZENLEME KURALLARI (KOD KORUMA PRENSİBİ):**
*   **ASLA SİLME:** Kullanıcı açıkça "şu özelliği/butonu/dosyayı sil" demediği sürece, mevcut olan hiçbir fonksiyonu, kütüphaneyi, HTML butonunu, CSS stilini veya değişkeni SİLME.
*   **FONKSİYONELLİĞİ KORU:** Mevcut eklentide Google Sheets entegrasyonu, Excel indirme veya özel API bağlantıları varsa, yeni özellik eklerken bu kod bloklarını aynen muhafaza et.
*   **SADECE EKLE VEYA GÜNCELLE:** Görevin mevcut yapıya yeni özellikler enjekte etmektir, mevcut yapıyı basitleştirmek veya "temizlemek" değildir.
*   Sana gönderilen dosyaların tamamını, yaptığın değişikliklerle birlikte geri döndür. Eksik dosya gönderme.

${commonRules}`;

function validateGeneratedFiles(files: any): files is GeneratedFile[] {
    if (!Array.isArray(files) || files.length === 0) return false;
    return files.every(f => typeof f.name === 'string' && typeof f.content === 'string');
}

const isBinaryOrImage = (filename: string): boolean => {
    return /\.(png|jpg|jpeg|gif|ico|svg|webp|bmp|zip|xlsx|xls)$/i.test(filename);
};

export async function generateExtension(
    prompt: string, 
    isThinkingMode: boolean, 
    existingFiles: GeneratedFile[] | null = null,
    additionalFiles: { name: string; content: string; isBinary: boolean }[] | null = null
): Promise<GeneratedFile[]> {
    const modelName = isThinkingMode ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    const config = isThinkingMode ? { thinkingConfig: { thinkingBudget: 32768 } } : {};

    const isEditing = existingFiles && existingFiles.length > 0;
    const currentSystemInstruction = isEditing ? editSystemInstruction : systemInstruction;
    
    let additionalFilesPrompt = '';
    if (additionalFiles && additionalFiles.length > 0) {
        additionalFiles.forEach(file => {
            additionalFilesPrompt += `--- EK DOSYA: ${file.name} ---\n${file.isBinary ? '[İkili Veri]' : file.content.substring(0, 50000)}\n\n`;
        });
    }

    const userContent = isEditing
      ? `${additionalFilesPrompt}Mevcut dosyalar:\n\`\`\`json\n${JSON.stringify(existingFiles)}\n\`\`\`\n\nİstenen Değişiklik: "${prompt}"\n\nÖNEMLİ: Mevcut hiçbir özelliği bozmadan veya silmeden bu değişikliği uygula.`
      : `${additionalFilesPrompt}Eklenti İsteği: "${prompt}"`;

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: userContent,
            config: {
                ...config,
                systemInstruction: currentSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.1,
            }
        });

        const parsedFiles = JSON.parse(response.text);
        if (validateGeneratedFiles(parsedFiles)) {
            return parsedFiles;
        }
        throw new Error("Geçersiz yanıt formatı.");
    } catch (error) {
        console.error("Gemini Hatası:", error);
        throw error;
    }
}

export async function analyzeExtension(files: GeneratedFile[]): Promise<string> {
    const systemInstruction = `Sen Chrome eklentisi analiz uzmanısın. Eklentinin ne işe yaradığını 1-2 cümleyle özetle.`;
    const filesString = files.map(f => `Dosya: ${f.name}\nİçerik: ${isBinaryOrImage(f.name) ? '[Resim]' : f.content.substring(0, 5000)}`).join('\n\n');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: filesString,
            config: { systemInstruction, temperature: 0.1 }
        });
        return response.text.trim();
    } catch (error) {
        return "Eklenti analiz edilemedi.";
    }
}

export async function generateIcon(description: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: `Modern flat chrome extension icon for: ${description}`,
            config: { responseModalities: [Modality.IMAGE] },
        });
        const part = response.candidates[0].content.parts.find(p => p.inlineData);
        return part?.inlineData?.data || "";
    } catch (error) {
        throw new Error("İkon üretilemedi.");
    }
}

export async function getChatbotResponse(
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    files: GeneratedFile[] | null
): Promise<string> {
    const chatbotSystemInstruction = `Sen "Sihirbaz Asistanı"sın. Eklentinin mevcut kodlarını analiz ederek hataları bul ve kullanıcıya "Düzeltme & Düzenleme" kutusuna yazması gereken komutu söyle. 

**GÖREVİN:**
1. Sana verilen kodları incele.
2. Kullanıcının sorularını bu kodlara dayanarak yanıtla.
3. Mevcut özellikleri (Google Sheets, Excel vb.) korumaya odaklan.
4. ASLA kendin kod yazıp tam dosya içeriği verme; sadece mantığı anlat ve kullanıcıyı düzenleme kutusuna yönlendir.`;
    
    // Dosya bağlamını güvenli bir şekilde oluştur
    let fileContext = "";
    if (files && files.length > 0) {
        fileContext = "MEVCUT EKLENTİ KODLARI:\n";
        files.forEach(f => {
            // Resimleri ve devasa kütüphaneleri (xlsx gibi) asistanın okumasına gerek yok, sadece isim yeterli.
            if (isBinaryOrImage(f.name) || f.content.length > 50000) {
                fileContext += `Dosya: ${f.name} (İçerik çok büyük veya resim olduğundan atlandı)\n\n`;
            } else {
                fileContext += `Dosya: ${f.name}\nİçerik:\n${f.content}\n\n`;
            }
        });
    }

    // Geçmişin en başına dosya bağlamını ekle (eğer dosya varsa)
    const contentsWithContext = [...history];
    if (fileContext) {
        contentsWithContext.unshift({
            role: 'user',
            parts: [{ text: fileContext }]
        });
    }
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: contentsWithContext,
            config: { systemInstruction: chatbotSystemInstruction, temperature: 0.7 }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Chatbot Error:", error);
        return "Chatbot şu an dosya bağlamını okurken bir sorun yaşadı veya yanıt veremiyor.";
    }
}
