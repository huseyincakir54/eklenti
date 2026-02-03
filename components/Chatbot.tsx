
import React, { useState, useRef, useEffect } from 'react';
import { getChatbotResponse } from '../services/geminiService';
import { GeneratedFile } from '../types';

type Message = {
    role: 'user' | 'model';
    text: string;
};

interface ChatbotProps {
    files: GeneratedFile[] | null;
}

const ChatIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.839 8.839 0 01-4.083-.98L2 17l1.437-3.248A7.996 7.996 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM4.437 13.248A6 6 0 0010 15a6 6 0 005.563-3.752M15 8a1 1 0 100-2 1 1 0 000 2zM9 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
);

const CloseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);

const SendIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009.894 15V4.106A1 1 0 0010.894 2.553z" />
    </svg>
);

const CodeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const Chatbot: React.FC<ChatbotProps> = ({ files }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'Merhaba! Ben Sihirbaz Asistanı. Yüklediğin veya oluşturduğun eklentinin kodlarını okuyabilir, hataları bulabilir ve sana rehberlik edebilirim. Nasıl yardımcı olabilirim?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const hasFiles = files && files.length > 0;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', text: input.trim() };
        const currentMessages = [...messages, userMessage];
        setMessages(currentMessages);
        setInput('');
        setIsLoading(true);

        try {
            // Gemini API formatına dönüştür
            const apiHistory = currentMessages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const responseText = await getChatbotResponse(apiHistory, files);
            const modelMessage: Message = { role: 'model', text: responseText };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-40 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 transition-transform duration-200 hover:scale-110"
                aria-label="Yardım Asistanını Aç"
            >
                <ChatIcon />
                {hasFiles && !isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-gray-900"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-[90vw] max-w-md h-[70vh] max-h-[600px] bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                    <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 shrink-0">
                        <div>
                            <h3 className="text-lg font-bold text-white">Sihirbaz Asistanı</h3>
                            {hasFiles ? (
                                <div className="flex items-center gap-1.5 text-[10px] text-green-400 font-medium uppercase tracking-wider">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Kod Analizi Aktif ({files.length} Dosya)
                                </div>
                            ) : (
                                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                                    Beklemede (Dosya Yüklenmedi)
                                </div>
                            )}
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded-lg">
                            <CloseIcon />
                        </button>
                    </header>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-900/20">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'model' && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0 overflow-hidden border border-purple-400">
                                        <CodeIcon />
                                    </div>
                                )}
                                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none border border-gray-600'}`}>
                                    <div 
                                        className="text-sm prose prose-invert prose-p:my-0 prose-pre:my-2 prose-pre:bg-gray-950 prose-code:text-xs leading-relaxed" 
                                        dangerouslySetInnerHTML={{ 
                                            __html: msg.text
                                                .replace(/\n/g, '<br/>')
                                                .replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre class="bg-black/40 p-2 rounded text-xs my-2 overflow-x-auto"><code>$2</code></pre>')
                                                .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 rounded text-purple-300">$1</code>')
                                        }} 
                                    />
                                </div>
                            </div>
                        ))}
                         {isLoading && (
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0 border border-purple-400">
                                    <CodeIcon />
                                </div>
                                <div className="px-4 py-3 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none border border-gray-600">
                                   <div className="flex items-center space-x-1.5">
                                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                   </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-gray-700 bg-gray-800 shrink-0">
                        <div className="relative">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={hasFiles ? "Eklenti hakkında bir soru sorun..." : "Bir mesaj yazın..."}
                                rows={1}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl py-3 pl-4 pr-12 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-500 resize-none text-sm"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
                                aria-label="Gönder"
                            >
                                <SendIcon />
                            </button>
                        </div>
                        <p className="mt-2 text-[10px] text-center text-gray-500">
                            Asistan kodlarınızı okur ancak doğrudan değişiklik yapamaz. Talimatları kopyalayıp düzenleme kutusuna yapıştırın.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
