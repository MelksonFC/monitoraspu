import React, { createContext, useState, useContext, ReactNode } from "react";

// 1. Definimos o que nosso contexto irá fornecer
interface LayoutContextType {
  isPresentationMode: boolean;
  togglePresentationMode: () => void;
}

// 2. Criamos o contexto com um valor padrão
const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

// 3. Criamos o Provedor, que gerenciará o estado
export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  const togglePresentationMode = () => {
    setIsPresentationMode(prev => !prev);
  };

  const value = { isPresentationMode, togglePresentationMode };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
};

// 4. Criamos um hook customizado para facilitar o uso do contexto
export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout deve ser usado dentro de um LayoutProvider");
  }
  return context;
};