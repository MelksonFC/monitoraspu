import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import api from './services/api';

type ThemeName = string;
type ChartColorScheme = 'monochromatic' | 'multicolor';
type UiMode = 'light' | 'dark';

interface Theme {
  name: ThemeName;
  label: string;
  color: string;
  isDark: boolean;
}

type ThemeContextType = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  chartColorScheme: ChartColorScheme;
  setChartColorScheme: (scheme: ChartColorScheme) => void;
  uiMode: UiMode;
  setUiMode: (mode: UiMode) => void;
  themes: Theme[];
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themes: Theme[] = [
    { name: "theme-blue", label: "Azul (Padrão)", color: "#007bff", isDark: false },
    { name: "theme-green", label: "Verde Clássico", color: "#28a745", isDark: false },
    { name: "theme-orange", label: "Laranja Vibrante", color: "#fd7e14", isDark: false },
    { name: "theme-volcano", label: "Vulcão Ativo (Escuro)", color: "#E63946", isDark: true },
    { name: "theme-dark-forest", label: "Dark Forest (Escuro)", color: "#3A8E5A", isDark: true },
    { name: "theme-dark-mountain", label: "Dark Mountain (Escuro)", color: "#343a40", isDark: true },
];

const applyTheme = (themeName: string) => {
    document.documentElement.setAttribute('data-theme', themeName);
};

const applyUiMode = (mode: UiMode) => {
    if (mode === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { usuario } = useAuth();
  const [theme, setThemeState] = useState<ThemeName>('theme-blue');
  const [chartColorScheme, setChartColorSchemeState] = useState<ChartColorScheme>('monochromatic');
  const [uiMode, setUiModeState] = useState<UiMode>('light');

  useEffect(() => {
    const fetchThemePreference = async () => {
      if (usuario?.id) {
        console.log("Buscando preferência de tema para o usuário:", usuario.id);
        try {
          const { data } = await api.get(`/userpreferences/${usuario.id}`);
          console.log("API retornou as preferências:", data);
          
          const savedTheme = data.themepreference || 'theme-blue';
          const savedScheme = data.chartcolorscheme || 'monochromatic';
          const savedUiMode = data.uimode || 'light';

          setThemeState(savedTheme);
          setChartColorSchemeState(savedScheme);
          setUiModeState(savedUiMode);

          applyTheme(savedTheme);
          applyUiMode(savedUiMode);
          localStorage.setItem('theme', savedTheme);
          localStorage.setItem('chartColorScheme', savedScheme);
          localStorage.setItem('uiMode', savedUiMode);

        } catch (error) {
          console.error("Falha ao buscar preferência de tema da API", error);
          // Fallback para localStorage se a API falhar
          const storedTheme = localStorage.getItem('theme') as ThemeName | null;
          const storedScheme = localStorage.getItem('chartColorScheme') as ChartColorScheme | null;
          const storedUiMode = localStorage.getItem('uiMode') as UiMode | null;
          if (storedTheme) {
            setThemeState(storedTheme);
            applyTheme(storedTheme);
          }
          if (storedScheme) {
            setChartColorSchemeState(storedScheme);
          }
          if (storedUiMode) {
            setUiModeState(storedUiMode);
            applyUiMode(storedUiMode);
          }
        }
      }
    };

    fetchThemePreference();
  }, [usuario]);

  const updateTheme = async (newTheme: ThemeName) => {
    console.log(`Tentando alterar o tema para: ${newTheme}`);
    setThemeState(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme); // Atualização otimista da UI

    if (usuario?.id) {
      try {
        console.log(`Enviando para a API: PUT /userpreferences/${usuario.id}`, { themepreference: newTheme });
        await api.put(`/userpreferences/${usuario.id}`, { themepreference: newTheme });
      } catch (error) {
        console.error("Falha ao salvar preferência de tema na API", error);
        // TODO: Adicionar lógica para reverter em caso de erro, se necessário
      }
    }
  };

  const updateUiMode = async (newMode: UiMode) => {
    console.log(`Tentando alterar o modo de UI para: ${newMode}`);
    setUiModeState(newMode);
    applyUiMode(newMode);
    localStorage.setItem('uiMode', newMode);

    if (usuario?.id) {
      try {
        console.log(`Enviando para a API: PUT /userpreferences/${usuario.id}`, { uimode: newMode });
        await api.put(`/userpreferences/${usuario.id}`, { uimode: newMode });
      } catch (error) {
        console.error("Falha ao salvar modo de UI na API", error);
      }
    }
  };

  const updateChartColorScheme = async (newScheme: ChartColorScheme) => {
    console.log(`Tentando alterar o esquema de cores para: ${newScheme}`);
    setChartColorSchemeState(newScheme);
    localStorage.setItem('chartColorScheme', newScheme); // Atualização otimista

    if (usuario?.id) {
      try {
        console.log(`Enviando para a API: PUT /userpreferences/${usuario.id}`, { chartcolorscheme: newScheme });
        await api.put(`/userpreferences/${usuario.id}`, { chartcolorscheme: newScheme });
      } catch (error) {
        console.error("Falha ao salvar esquema de cores na API", error);
        // TODO: Adicionar lógica para reverter em caso de erro, se necessário
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ 
        theme, 
        setTheme: updateTheme, 
        chartColorScheme, 
        setChartColorScheme: updateChartColorScheme,
        uiMode,
        setUiMode: updateUiMode,
        themes 
    }}>
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
