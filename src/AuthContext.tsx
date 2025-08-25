import React, { createContext, useContext, useState, useEffect } from "react";

// Defina o tipo do usuário
type Usuario = {
  id: number;
  nome: string;
  email: string;
  idpermissao: number;
  ativo: number;
  // ... outros campos que você quiser
};

// 1. ATUALIZADO: Definimos o "contrato" do nosso contexto.
// Ele terá o usuário, uma função para login e uma para logout.
type AuthContextType = {
  usuario: Usuario | null;
  login: (userData: Usuario) => void;
  logout: () => void;
  setUsuario: (usuario: Usuario | null) => void; 
};

// Valor inicial para o contexto
const AuthContext = createContext<AuthContextType>({
  usuario: null,
  setUsuario: () => {},
  login: () => {},
  logout: () => {},
  
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  // Este useEffect para carregar o usuário do localStorage na inicialização está ótimo.
  useEffect(() => {
    const usuarioSalvo = localStorage.getItem("usuario");
    if (usuarioSalvo) {
      try {
        setUsuario(JSON.parse(usuarioSalvo));
      } catch (e) {
        console.error("Falha ao ler dados do usuário do localStorage", e);
        localStorage.removeItem("usuario"); // Limpa dados inválidos
      }
    }
  }, []);

  // 2. CRIADO: Função de login que centraliza a lógica.
  // Ela atualiza o estado E o localStorage.
  const login = (userData: Usuario) => {
    localStorage.setItem("usuario", JSON.stringify(userData));
    setUsuario(userData);
  };

  // 3. CRIADO: Função de logout que centraliza a lógica.
  // Ela limpa o estado E o localStorage.
  const logout = () => {
    localStorage.removeItem("usuario");
    setUsuario(null);
  };

  // 4. ATUALIZADO: Fornecemos as novas funções no `value`.
  return (
    <AuthContext.Provider value={{ usuario, setUsuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};