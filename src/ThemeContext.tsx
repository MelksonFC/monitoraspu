import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

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
        try {
          // Supondo que você tenha uma função para buscar as preferências do usuário
          // Ex: const userPreferences = await api.get(`/userpreferences/${user.id}`);
          // setThemeState(userPreferences.uimode || 'light');
          // Por enquanto, vamos simular
          const storedTheme = localStorage.getItem('theme') as Theme | null;
          if (storedTheme) {
            setThemeState(storedTheme);
          }
        } catch (error) {
          console.error("Failed to fetch theme preference", error);
        }
      }
    };

    fetchThemePreference();
  }, [usuario]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    // Salvar a preferência no backend
    if (usuario?.id) {
      // Supondo uma função de API para atualizar
      // api.put(`/userpreferences/${user.id}`, { uimode: newTheme });
    }
    // E no localStorage para persistência na sessão
    localStorage.setItem('theme', newTheme);
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
