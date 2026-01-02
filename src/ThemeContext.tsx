import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import api from './services/api';

type Theme = 'dark' | 'light';

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { usuario } = useAuth();
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const fetchThemePreference = async () => {
      if (usuario?.id) {
        console.log("Buscando preferência de tema para o usuário:", usuario.id);
        try {
          const { data } = await api.get(`/userpreferences/${usuario.id}`);
          console.log("API retornou as preferências:", data);
          setThemeState(data.uimode || 'light');
          localStorage.setItem('theme', data.uimode || 'light');
        } catch (error) {
          console.error("Falha ao buscar preferência de tema da API", error);
          // Fallback para localStorage se a API falhar
          const storedTheme = localStorage.getItem('theme') as Theme | null;
          if (storedTheme) {
            setThemeState(storedTheme);
          }
        }
      }
    };

    fetchThemePreference();
  }, [usuario]);

  const setTheme = async (newTheme: Theme) => {
    console.log(`Tentando alterar o tema para: ${newTheme}`);
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme); // Atualização otimista da UI

    if (usuario?.id) {
      try {
        console.log(`Enviando para a API: PUT /userpreferences/${usuario.id}`, { uimode: newTheme });
        const response = await api.put(`/userpreferences/${usuario.id}`, { uimode: newTheme });
        console.log("API respondeu ao PUT:", response);
      } catch (error) {
        console.error("Falha ao salvar preferência de tema na API", error);
      }
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
