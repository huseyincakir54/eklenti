
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text">
        Chrome Eklenti Sihirbazı
      </h1>
      <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
        Fikirlerinizi anında tarayıcı eklentilerine dönüştürün. Ne istediğinizi açıklayın, gerisini yapay zeka halletsin.
      </p>
    </header>
  );
};

export default Header;
