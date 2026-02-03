
import React from 'react';

const Loader: React.FC = () => {
  const messages = [
    "Dijital kahine danışılıyor...",
    "manifest.json taslağı hazırlanıyor...",
    "Popup betikleri birleştiriliyor...",
    "Kullanıcı arayüzü parlatılıyor...",
    "Eklenti dosyaları paketleniyor...",
    "Bir tutam sihir ekleniyor...",
  ];
  const [message, setMessage] = React.useState(messages[0]);

  React.useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setMessage(messages[index]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-8 flex flex-col items-center justify-center text-center p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
      <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-lg text-gray-300 font-medium transition-opacity duration-500">{message}</p>
      <p className="mt-1 text-sm text-gray-500">Bu işlem biraz zaman alabilir, özellikle Düşünme Modunda.</p>
    </div>
  );
};

export default Loader;
