import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, Sector, XAxis, YAxis, LabelList, Label as RechartsLabel, Cell } from 'recharts';
import type { PieSectorDataItem } from "recharts/types/polar/Pie"
import type { Imovel, Fiscalizacao, Avaliacao } from '@/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Library, ClipboardList, LandPlot, Building2, CircleDollarSign, Settings, Palette, Maximize, Minimize } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "../AuthContext";
import { useLayout } from "../LayoutContext"; 

const API_URL = import.meta.env.VITE_API_URL;

const themes = [
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

const ThemePaletteSwatch = ({ theme }: { theme: typeof themes[0] }) => {
    // Define qual paleta usar com base na propriedade `isDark`
    const palettePrefix = theme.isDark ? '--chart-color-' : '--chart-mono-';
    
    // Cria um array para gerar as 5 cores com o intervalo de 3
    const colorIndices = Array.from({ length: 5 }, (_, i) => 1 + (i * 3)); // Gera [1, 4, 7, 10, 13]

    return (
        <div className="flex h-4 w-full overflow-hidden rounded-full">
            {colorIndices.map(index => (
                <div
                    key={`${theme.name}-${index}`}
                    className="flex-1"
                    // Aplica a cor dinamicamente, "enganando" o CSS para usar a paleta correta
                    // antes mesmo de o tema ser totalmente aplicado no DOM.
                    style={{ 
                        backgroundColor: `hsl(var(${palettePrefix}${index}, var(--primary)))` 
                    }}
                    data-theme={theme.name} // Garante que as variáveis CSS do tema certo sejam usadas
                />
            ))}
        </div>
    );
};

// Centraliza a lógica de criação de chaves para evitar inconsistências.
const toConfigKey = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
};

const generateChartConfig = (
    data: { name: string }[],
    scheme: 'multicolor' | 'monochromatic'
): ChartConfig => {
    const config: ChartConfig = {};
    const prefix = scheme === 'monochromatic' ? '--chart-mono-' : '--chart-color-';

    // Ordem de alto contraste para a paleta monocromática (do mais escuro ao mais claro, pulando)
    const monoIndexMap = [1, 2, 3, 4, 5, 6,  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]; 

    data.forEach((item, index) => {
        const key = toConfigKey(item.name);
        let colorIndex: number;

        if (scheme === 'monochromatic') {
            // Usa o mapa de alto contraste para escolher a cor
            colorIndex = monoIndexMap[index % monoIndexMap.length];
        } else {
            // Usa a ordem sequencial normal para o modo colorido
            colorIndex = (index % 20) + 1;
        }

        config[key] = {
            label: item.name,
            color: `hsl(var(${prefix}${colorIndex}))`,
        };
    });
    return config;
};

const formatFullNumber = (num: number): string => num.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const formatCompactNumber = (num: number, options: { style?: 'currency', currency?: string } = {}) => {
    if (isNaN(num)) return '0';
    const prefix = options.style === 'currency' ? 'R$ ' : '';
    if (num >= 1e9) return `${prefix}${(num / 1e9).toFixed(3)} Bi`;
    if (num >= 1e6) return `${prefix}${(num / 1e6).toFixed(3)} Mi`;
    if (num >= 1e3) return `${prefix}${(num / 1e3).toFixed(2)} mil`;
    return `${prefix}${num.toLocaleString('pt-BR')}`;
};

const formatArea = (areaInM2: number) => {
    if (isNaN(areaInM2)) return { value: 0, unit: 'm²' };
    if (areaInM2 > 1000000) return { value: (areaInM2 / 1000000).toFixed(2), unit: 'km²' };
    return { value: areaInM2.toLocaleString('pt-BR'), unit: 'm²' };
};

function getDateRangeFromTimeRange(range: string) {
    const now = new Date();
    let start = new Date(now);
    if (range.endsWith("m")) {
        start.setMonth(now.getMonth() - parseInt(range.replace("m", ""), 10));
    } else if (range.endsWith("d")) {
        start.setDate(now.getDate() - parseInt(range.replace("d", ""), 10));
    }
    return { start, end: now };
}

function groupActivitiesByMonth(avaliacoes: Avaliacao[], fiscalizacoes: Fiscalizacao[], timeRange: string) {
    const { start, end } = getDateRangeFromTimeRange(timeRange);
    const monthlyMap: Record<string, { avaliacoes: number, fiscalizacoes: number }> = {};
    const processItems = (items: any[], type: 'avaliacoes' | 'fiscalizacoes', dateField: string) => {
        for (const item of items) {
            if (!item[dateField]) continue;
            const date = new Date(item[dateField]);
            if (date < start || date > end) continue;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap[key]) monthlyMap[key] = { avaliacoes: 0, fiscalizacoes: 0 };
            monthlyMap[key][type] += 1;
        }
    };
    processItems(avaliacoes, 'avaliacoes', 'dataavaliacao');
    processItems(fiscalizacoes, 'fiscalizacoes', 'datafiscalizacao');
    return Object.entries(monthlyMap).map(([key, values]) => ({ month: key, ...values })).sort((a, b) => new Date(a.month + '-01').getTime() - new Date(b.month + '-01').getTime());
}

export default function ShadcnDashboard() {
    const { usuario } = useAuth();
    const [imoveis, setImoveis] = useState<Imovel[]>([]);
    const [municipios, setMunicipios] = useState<any[]>([]);
    const [regimes, setRegimes] = useState<any[]>([]);
    const [fiscalizacoes, setFiscalizacoes] = useState<Fiscalizacao[]>([]);
    const [avaliacoes, setAcaliacoes] = useState<Avaliacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeRegime, setActiveRegime] = useState<string>("");
    const [timeRange, setTimeRange] = useState("24m");
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [drillImoveis, setDrillImoveis] = useState<Imovel[]>([]);
    const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);
    const [selectedRegimeCard, setSelectedRegimeCard] = useState<string | null>(null);
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [currentTheme, setCurrentTheme] = useState("theme-blue");
    const [selectedTheme, setSelectedTheme] = useState("theme-blue");
    const [chartColorScheme, setChartColorScheme] = useState<'monochromatic' | 'multicolor'>('monochromatic');
    const [selectedChartColorScheme, setSelectedChartColorScheme] = useState(chartColorScheme);
    const { isPresentationMode, togglePresentationMode } = useLayout();

    const openThemeMenu = () => { setSelectedTheme(currentTheme); setSelectedChartColorScheme(chartColorScheme); setIsThemeMenuOpen(true); };
    const handleThemeSelectionChange = (newThemeName: string) => setSelectedTheme(newThemeName);
    const handleApplyTheme = async () => {
        if (!usuario?.id) return;
        
        const isThemeChanged = selectedTheme !== currentTheme;
        const isSchemeChanged = selectedChartColorScheme !== chartColorScheme;

        if (!isThemeChanged && !isSchemeChanged) {
            setIsThemeMenuOpen(false);
            return;
        }
        
        // Atualiza a UI imediatamente
        if (isThemeChanged) {
            applyTheme(selectedTheme);
            setCurrentTheme(selectedTheme);
        }
        if(isSchemeChanged) {
            setChartColorScheme(selectedChartColorScheme);
        }

        setIsThemeMenuOpen(false);

        try {
            // Envia apenas o que mudou para a API
            const payload: { themepreference?: string, chartcolorscheme?: string } = {};
            if (isThemeChanged) payload.themepreference = selectedTheme;
            if (isSchemeChanged) payload.chartcolorscheme = selectedChartColorScheme;

            await axios.put(`${API_URL}/api/userpreferences/${usuario.id}`, payload);
        } catch (err) {
            console.error("Falha ao salvar preferências:", err);
            // Reverte em caso de erro
            applyTheme(currentTheme);
            setCurrentTheme(currentTheme);
            setChartColorScheme(chartColorScheme);
        }
    };

    useEffect(() => {
        if (!usuario?.id) { setLoading(false); return; }
        const fetchData = async () => {
            setLoading(true);
            try {
                const [imoveisRes, municipiosRes, regimesRes, fiscalizacoesRes, avaliacoesRes, themeRes] = await Promise.all([
                    axios.get(`${API_URL}/api/imoveis?situacao=true`),
                    axios.get(`${API_URL}/api/municipios`),
                    axios.get(`${API_URL}/api/regimeutilizacao`),
                    axios.get(`${API_URL}/api/fiscalizacoes`),
                    axios.get(`${API_URL}/api/avaliacoes`),
                    axios.get(`${API_URL}/api/userpreferences/${usuario.id}`),
                ]);

                const savedTheme = themeRes.data?.themepreference || "theme-blue";
                const savedScheme = themeRes.data?.chartcolorscheme || "monochromatic";

                setCurrentTheme(savedTheme);
                setSelectedTheme(savedTheme);
                applyTheme(savedTheme);

                setChartColorScheme(savedScheme);
                setSelectedChartColorScheme(savedScheme);

                const imoveisData = Array.isArray(imoveisRes.data) ? imoveisRes.data : [];
                setImoveis(imoveisData);
                setMunicipios(Array.isArray(municipiosRes.data) ? municipiosRes.data : []);
                setRegimes(Array.isArray(regimesRes.data) ? regimesRes.data : []);
                setFiscalizacoes(Array.isArray(fiscalizacoesRes.data) ? fiscalizacoesRes.data : []);
                setAcaliacoes(Array.isArray(avaliacoesRes.data) ? avaliacoesRes.data : []);

                if (imoveisData.length > 0) {
                    const regimeMap = new Map((regimesRes.data as any[]).map(r => [r.id, r.descricao || r.nome]));
                    const imoveisPorRegime = imoveisData.reduce<Record<string, number>>((acc, imovel) => {
                        const nomeRegime = imovel.idregimeutilizacao ? (regimeMap.get(imovel.idregimeutilizacao) || 'Não especificado') : 'Não especificado';
                        acc[nomeRegime] = (acc[nomeRegime] || 0) + 1;
                        return acc;
                    }, {});
                    const sortedRegimes = Object.entries(imoveisPorRegime).sort((a, b) => b[1] - a[1]);
                    if (sortedRegimes.length > 0) setActiveRegime(sortedRegimes[0][0]);
                }
            } catch (e) {
                setError(e instanceof Error ? `Falha ao buscar dados: ${e.message}` : "Erro desconhecido.");
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [usuario?.id]);

    const municipioMap = new Map(municipios.map((m: any) => [m.idmunicipio, m.nome]));
    const regimeMap = new Map(regimes.map((r: any) => [r.id, r.descricao || r.nome]));

    // [INÍCIO DAS FUNÇÕES RESTAURADAS]
    function getImoveisPorStatus(status: string): Imovel[] {
        const hoje = new Date();
        const prazoVencido = new Date(); prazoVencido.setFullYear(hoje.getFullYear() - 2);
        const prazoAVencer = new Date(); prazoAVencer.setFullYear(hoje.getFullYear() - 2); prazoAVencer.setMonth(hoje.getMonth() + 6);
        const ultimasFiscalizacoes = new Map<number, string>();
        for (const fisc of fiscalizacoes) {
            if (fisc.idimovel) {
                const dataAtual = ultimasFiscalizacoes.get(fisc.idimovel);
                if (!dataAtual || new Date(fisc.datafiscalizacao) > new Date(dataAtual)) ultimasFiscalizacoes.set(fisc.idimovel, fisc.datafiscalizacao);
            }
        }
        return imoveis.filter(imovel => {
            const ultimaFiscalizacao = imovel.idimovel ? ultimasFiscalizacoes.get(imovel.idimovel) : undefined;
            if (status === "nuncaFiscalizado") return !ultimaFiscalizacao;
            if (!ultimaFiscalizacao) return false;
            const dataFiscalizacao = new Date(ultimaFiscalizacao);
            if (status === "vencido") return dataFiscalizacao < prazoVencido;
            if (status === "aVencer") return dataFiscalizacao < prazoAVencer && dataFiscalizacao >= prazoVencido;
            if (status === "emDia") return dataFiscalizacao >= prazoAVencer;
            return false;
        });
    }

    function getImoveisPorMunicipio(municipioNome: string): Imovel[] {
        return imoveis.filter(imovel => {
            const nomeMunicipio = imovel.idmunicipio ? (municipioMap.get(imovel.idmunicipio) || `ID Mun. ${imovel.idmunicipio}`) : 'Não especificado';
            return nomeMunicipio === municipioNome;
        });
    }

    function getImoveisPorRegime(regimeNome: string): Imovel[] {
        return imoveis.filter(imovel => {
            const nomeRegime = imovel.idregimeutilizacao ? (regimeMap.get(imovel.idregimeutilizacao) || `ID Reg. ${imovel.idregimeutilizacao}`) : 'Não especificado';
            return nomeRegime === regimeNome;
        });
    }

    function formatPieCenterText(text: string, maxLength: number = 16): string[] {
        if (text.length <= maxLength) return [text];
        const words = text.split(' ');
        let line1 = "", line2 = "";
        for (const word of words) {
            if ((line1 + ' ' + word).trim().length <= maxLength) {
                line1 += (line1 ? ' ' : '') + word;
            } else {
                line2 += (line2 ? ' ' : '') + word;
            }
        }
        if (line2.length > maxLength) line2 = line2.slice(0, maxLength - 1) + '…';
        return [line1, line2];
    }
    // [FIM DAS FUNÇÕES RESTAURADAS]

    const dataMunicipio = React.useMemo(() => {
        const imoveisPorMunicipio = imoveis.reduce<Record<string, number>>((acc, imovel) => {
            const nomeMunicipio = imovel.idmunicipio ? (municipioMap.get(imovel.idmunicipio) || `ID Mun. ${imovel.idmunicipio}`) : 'Não especificado';
            acc[nomeMunicipio] = (acc[nomeMunicipio] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(imoveisPorMunicipio).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [imoveis, municipioMap]);
    
    const chartConfigMunicipio = React.useMemo(() => {
        // 1. Cria a configuração base para o tooltip
        const tooltipConfig: ChartConfig = {
            value: {
                label: "Nº de Imóveis",
            },
        };

        // 2. Gera as cores dinâmicas para cada barra
        const barColorConfig = generateChartConfig(dataMunicipio, chartColorScheme);

        // 3. Combina os dois objetos: o tooltip funcionará e cada barra terá sua cor
        return {
            ...tooltipConfig,
            ...barColorConfig,
        };
    }, [dataMunicipio, chartColorScheme]);


    const dataRegime = React.useMemo(() => {
        const imoveisPorRegime = imoveis.reduce<Record<string, number>>((acc, imovel) => {
            const nomeRegime = imovel.idregimeutilizacao ? (regimeMap.get(imovel.idregimeutilizacao) || `ID Reg. ${imovel.idregimeutilizacao}`) : 'Não especificado';
            acc[nomeRegime] = (acc[nomeRegime] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(imoveisPorRegime).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [imoveis, regimeMap]);

    const chartConfigRegime = generateChartConfig(dataRegime, chartColorScheme);
    const totalImoveisRegime = dataRegime.reduce((sum, item) => sum + item.value, 0); // Linha restaurada
    const activeIndexRegime = React.useMemo(() => dataRegime.findIndex((item) => item.name === activeRegime), [activeRegime, dataRegime]);
    const regimesDestinadosIds = regimes.filter((r: any) => r.destinado === true).map((r: any) => r.id);
    const totalVago = dataRegime.find(r => r.name === 'Vago para Uso')?.value || 0;
    const totalEmRegularizacao = dataRegime.find(r => r.name === 'Em Regularização')?.value || 0;
    const totalDestinados = imoveis.filter(i => regimesDestinadosIds.includes(i.idregimeutilizacao)).length;
    
    const monthlyTimelineData = React.useMemo(() => groupActivitiesByMonth(avaliacoes, fiscalizacoes, timeRange), [avaliacoes, fiscalizacoes, timeRange]);
    const chartConfigTimeline = React.useMemo((): ChartConfig => {
        const prefix = chartColorScheme === 'monochromatic' ? '--chart-mono-' : '--chart-color-';
        return {
            avaliacoes: { 
                label: "Avaliações", 
                color: `hsl(var(${prefix}1))` // Pega a primeira cor da paleta
            },
            fiscalizacoes: { 
                label: "Fiscalizações", 
                color: `hsl(var(${prefix}10))` // Pega a segunda cor da paleta
            },
        };
    }, [chartColorScheme]);

    const dataStatusFiscalizacao = React.useMemo(() => {
        const hoje = new Date();
        const prazoVencido = new Date(); prazoVencido.setFullYear(hoje.getFullYear() - 2);
        const prazoAVencer = new Date(); prazoAVencer.setFullYear(hoje.getFullYear() - 2); prazoAVencer.setMonth(hoje.getMonth() + 6);

        const ultimasFiscalizacoes = new Map<number, string>();
        for (const fisc of fiscalizacoes) {
            if (fisc.idimovel) {
                const dataAtual = ultimasFiscalizacoes.get(fisc.idimovel);
                if (!dataAtual || new Date(fisc.datafiscalizacao) > new Date(dataAtual)) ultimasFiscalizacoes.set(fisc.idimovel, fisc.datafiscalizacao);
            }
        }

        const statusCounts = { emDia: 0, aVencer: 0, vencido: 0, nuncaFiscalizado: 0 };
        for (const imovel of imoveis) {
            if (imovel.idimovel) {
                const ultimaFiscalizacao = ultimasFiscalizacoes.get(imovel.idimovel);
                if (!ultimaFiscalizacao) { statusCounts.nuncaFiscalizado++; continue; }
                const dataFiscalizacao = new Date(ultimaFiscalizacao);
                if (dataFiscalizacao < prazoVencido) statusCounts.vencido++;
                else if (dataFiscalizacao < prazoAVencer) statusCounts.aVencer++;
                else statusCounts.emDia++;
            } else {
                statusCounts.nuncaFiscalizado++;
            }
        }
        return [{ name: "Status", ...statusCounts }];
    }, [imoveis, fiscalizacoes]);

    const chartConfigStatusFiscalizacao = React.useMemo((): ChartConfig => {
        const prefix = chartColorScheme === 'monochromatic' ? '--chart-mono-' : '--chart-color-';
        
        return {
            // Itens Dinâmicos: usam a paleta do tema
            emDia: {
                label: "Em Dia",
                color: `hsl(var(${prefix}1))` // Primeira cor da paleta
            },
            aVencer: {
                label: "A Vencer",
                color: `hsl(var(${prefix}10))` // decima cor da paleta
            },
            // Itens Estáticos: usam cores globais definidas no CSS
            vencido: {
                label: "Vencido",
                color: `hsl(var(--color-status-vencido))`
            },
            nuncaFiscalizado: {
                label: "Nunca Fiscalizado",
                color: `hsl(var(--color-status-nunca))`
            },
        };
    }, [chartColorScheme]);

    if (loading) return <div className="flex items-center justify-center h-screen"><p>Carregando dados...</p></div>;
    if (error) return <div className="container mx-auto p-8"><Card className="bg-destructive text-destructive-foreground"><CardHeader><CardTitle>Erro</CardTitle></CardHeader><CardContent>{error}</CardContent></Card></div>;
    if (!usuario) return <div className="flex items-center justify-center h-screen"><p>Por favor, faça login para acessar o dashboard.</p></div>;

    const totalRipImoveis = new Set(imoveis.map(i => i.ripimovel).filter(Boolean)).size;
    const totalRipUtilizacao = new Set(imoveis.map(i => i.riputilizacao).filter(Boolean)).size;
    const totalAreaTerreno = imoveis.reduce((s, i) => s + Number(i.areaterreno || 0), 0);
    const totalAreaConstruida = imoveis.reduce((s, i) => s + Number(i.areaconstruida || 0), 0);
    const valorTotalImoveis = imoveis.reduce((s, i) => s + Number(i.valorimovel || 0), 0);
    const totalSemEdificacao = imoveis.filter(i => !i.areaconstruida || Number(i.areaconstruida) === 0).length;
    const mediaValorImoveis = imoveis.length > 0 ? (valorTotalImoveis / imoveis.length) : 0;
    const formattedAreaTerreno = formatArea(totalAreaTerreno);
    const formattedAreaConstruida = formatArea(totalAreaConstruida);

    return (
        <TooltipProvider delayDuration={100}>
        <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8 relative">
            {/* --- MENU DE PERSONALIZAÇÃO DE TEMA (ATUALIZADO) --- */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                {/* Botão para o Modo Apresentação */}
                <Button variant="outline" size="icon" onClick={togglePresentationMode} aria-label="Modo Apresentação">
                    {isPresentationMode ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </Button>

                {/* Menu de Configurações de Tema */}
                <div className="relative">
                    <Button variant="outline" size="icon" onClick={isThemeMenuOpen ? () => setIsThemeMenuOpen(false) : openThemeMenu} aria-label="Personalizar Tema">
                        <Settings className="h-5 w-5" />
                    </Button>
                    {isThemeMenuOpen && (
                    <div className="absolute top-14 right-0 w-72 rounded-lg bg-card shadow-lg border p-4 animate-in fade-in-0 zoom-in-95">
                        <div className="flex items-center gap-3 mb-4"><Palette className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold text-card-foreground">Personalizar Aparência</h3></div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Tema Visual</label>
                                <Select value={selectedTheme} onValueChange={handleThemeSelectionChange}>
                                    <SelectTrigger><SelectValue placeholder="Selecione um tema" /></SelectTrigger>
                                    <SelectContent>
                                        {themes.map((theme) => (
                                            <SelectItem key={theme.name} value={theme.name}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10"> {/* Container para a paleta */}
                                                        <ThemePaletteSwatch theme={theme} />
                                                    </div>
                                                    {theme.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* [NOVO] Seletor de Esquema de Cores do Gráfico */}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Cores dos Gráficos</label>
                                <Select value={selectedChartColorScheme} onValueChange={(value) => setSelectedChartColorScheme(value as any)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="multicolor">Colorido</SelectItem>
                                        <SelectItem value="monochromatic">Monocromático</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <CardFooter className="p-0 pt-4">
                                <Button
                                    onClick={handleApplyTheme}
                                    disabled={selectedTheme === currentTheme && selectedChartColorScheme === chartColorScheme}
                                    className="w-full"
                                >
                                    Aplicar
                                </Button>
                            </CardFooter>
                        </div>
                    </div>
                )}
                </div>
            </div>

            {/* Linha de KPIs principais */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 pt-14">
                {/* RIP Imóvel */}
                <Card className="shadow-md card-gradient">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">RIP Imóvel</CardTitle>
                        {/* A cor do ícone agora usa a mesma cor da fonte do card */}
                        <Library className="h-4 w-4 card-gradient-icon" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRipImoveis.toLocaleString('pt-BR')}</div>
                    </CardContent>
                </Card>

                {/* RIP Utilização */}
                <Card className="shadow-md card-gradient">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">RIP Utilização</CardTitle>
                        <ClipboardList className="h-4 w-4 card-gradient-icon" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRipUtilizacao.toLocaleString('pt-BR')}</div>
                    </CardContent>
                </Card>

                {/* Área Terreno */}
                    <Card className="shadow-md card-gradient">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Área Terreno</CardTitle>
                            <LandPlot className="h-4 w-4 card-gradient-icon" />
                        </CardHeader>
                        <CardContent className="relative pb-6">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {/* O `div` com o número compacto agora é o gatilho do tooltip */}
                                    <div className="text-2xl font-bold cursor-help">
                                        {formatCompactNumber(Number(totalAreaTerreno))} 
                                        <span className="text-xs opacity-80 ml-1">{formattedAreaTerreno.unit}</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Valor exato: {formatFullNumber(Number(totalAreaTerreno))} {formattedAreaTerreno.unit}</p>
                                </TooltipContent>
                            </Tooltip>
                            <div className="absolute bottom-2 right-4 text-xs opacity-90">
                                Sem edificação: {totalSemEdificacao}
                            </div>
                        </CardContent>
                    </Card>

                {/* Área Construída */}
                    <Card className="shadow-md card-gradient">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Área Construída</CardTitle>
                            <Building2 className="h-4 w-4 card-gradient-icon" />
                        </CardHeader>
                        <CardContent>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="text-2xl font-bold cursor-help">
                                        {formatCompactNumber(Number(totalAreaConstruida))}
                                        <span className="text-xs opacity-80 ml-1">{formattedAreaConstruida.unit}</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Valor exato: {formatFullNumber(Number(totalAreaConstruida))} {formattedAreaConstruida.unit}</p>
                                </TooltipContent>
                            </Tooltip>
                        </CardContent>
                    </Card>

                {/* Valor Total Imóveis */}
                    <Card className="shadow-md card-gradient">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Valor Total Imóveis</CardTitle>
                            <CircleDollarSign className="h-4 w-4 card-gradient-icon" />
                        </CardHeader>
                        <CardContent className="relative pb-6">
                           <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="text-2xl font-bold cursor-help">
                                        {formatCompactNumber(valorTotalImoveis, { style: 'currency' })}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                     <p>Valor exato: {formatFullNumber(Number(valorTotalImoveis))}</p>
                                </TooltipContent>
                            </Tooltip>
                            <div className="absolute bottom-2 right-4 text-xs opacity-90">
                                Média: {formatCompactNumber(mediaValorImoveis, { style: 'currency' })}
                            </div>
                        </CardContent>
                    </Card>
            </div>

            {/* Linha de Gráficos Principais */}
            <div className="grid gap-1 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader><CardTitle>Imóveis por Município</CardTitle></CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfigMunicipio} className="w-full" style={{ maxHeight: "460px", overflowY: "auto" }}>
                        <BarChart accessibilityLayer data={dataMunicipio} layout="vertical" margin={{ left: 1, right: 0.5 }} height={Math.max(260, dataMunicipio.length * 45)}>
                            <CartesianGrid horizontal={false} />
                            <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} hide />
                            <XAxis dataKey="value" type="number" hide />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" hideLabel />} />
                            <Bar dataKey="value" radius={4} onClick={(_data, index) => { const municipio = dataMunicipio[index].name; 
                                setSelectedMunicipio(municipio); 
                                setDrillImoveis(getImoveisPorMunicipio(municipio)); }}>
                                    {dataMunicipio.map((entry) => {
                                        const key = toConfigKey(entry.name);
                                        const config = chartConfigMunicipio[key];
                                        return <Cell key={`cell-${key}`} fill={config?.color || `hsl(var(--chart-color-1))`} />;
                                    })} 
                                <LabelList dataKey="name" position="insideLeft" offset={8} className="fill-primary-foreground" fontSize={12} />
                                <LabelList dataKey="value" position="right" offset={8} className="fill-foreground" fontSize={12} />
                            </Bar>
                        </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                
                <Card className="md:col-span-3 flex flex-col">
                    <CardHeader className="flex-row items-start space-y-0 pb-0">
                        <div className="grid gap-1">
                            <CardTitle>Distribuição por Regime</CardTitle>
                            <CardDescription>Percentual de imóveis por regime</CardDescription>
                        </div>
                        <Select value={activeRegime} onValueChange={setActiveRegime}>
                            <SelectTrigger className="ml-auto h-7 w-[150px] rounded-lg pl-2.5" aria-label="Selecione o Regime">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent align="end" className="rounded-xl">
                                {/* Mapeamos diretamente o `dataRegime` para garantir que todos os itens apareçam */}
                                {dataRegime.map((item) => {
                                    const configKey = toConfigKey(item.name);
                                    const config = chartConfigRegime[configKey as keyof typeof chartConfigRegime];
                                    
                                    // Se por algum motivo a config não existir, ainda renderizamos com um fallback
                                    const label = config?.label || item.name;
                                    const color = config?.color || 'hsl(var(--muted))';

                                    return (
                                        <SelectItem key={item.name} value={item.name} className="rounded-lg [&_span]:flex">
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="flex h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                                                {label}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="flex flex-1 justify-center pb-0">
                        <ChartContainer config={chartConfigRegime} className="mx-auto aspect-square w-full max-w-[300px] min-h-24">
                            <PieChart>
                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                <Pie data={dataRegime} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5} activeIndex={activeIndexRegime} activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => 
                                    (<g><Sector {...props} outerRadius={outerRadius + 10} />
                                    <Sector {...props} outerRadius={outerRadius + 25} innerRadius={outerRadius + 12} /></g>)}>
                                    {dataRegime.map((entry) => {
                                        const key = toConfigKey(entry.name);
                                        return <Cell key={`cell-${key}`} fill={chartConfigRegime[key]?.color} />;
                                    })}
                                    <RechartsLabel
                                        content={({ viewBox }) => {
                                            if (!viewBox || typeof (viewBox as any).cx !== "number") return null;
                                            const { cx, cy } = viewBox as any;
                                            const activeData = dataRegime[activeIndexRegime];
                                            const percentage = totalImoveisRegime > 0 && activeData ? (activeData.value / totalImoveisRegime) * 100 : 0;
                                            const lines = formatPieCenterText(activeRegime, 16);
                                            return (
                                                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                                                    <tspan x={cx} y={cy - 12} className="fill-foreground text-3xl font-bold">{percentage.toFixed(1)}%</tspan>
                                                    {lines.map((line, idx) => (<tspan key={idx} x={cx} y={cy + idx * 18 + 10} className="fill-muted-foreground" fontSize={12}>{line}</tspan>))}
                                                </text>
                                            );
                                        }}
                                    />
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                    <div className="grid grid-cols-3 md:gap-8 md:p-8">
                        <Card className="bg-gradient-to-br from-zinc-700 to-zinc-500 text-primary-foreground" style={{ cursor: "pointer" }} onClick={() => { setSelectedRegimeCard('Vago para Uso'); setDrillImoveis(getImoveisPorRegime('Vago para Uso')); }}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Vago para Uso</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalVago}</p></CardContent></Card>
                        <Card className="bg-gradient-to-br from-zinc-700 to-zinc-500 text-primary-foreground" style={{ cursor: "pointer" }} onClick={() => { setSelectedRegimeCard('Em Regularização'); setDrillImoveis(getImoveisPorRegime('Em Regularização')); }}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Em Regularização</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalEmRegularizacao}</p></CardContent></Card>
                        <Card className="bg-gradient-to-br from-zinc-700 to-zinc-500 text-primary-foreground" style={{ cursor: "pointer" }} onClick={() => { setSelectedRegimeCard('Destinados'); setDrillImoveis(imoveis.filter(i => regimesDestinadosIds.includes(i.idregimeutilizacao))); }}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Destinados</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalDestinados}</p></CardContent></Card>
                    </div>
                </Card>
            </div>

            {/* GRÁFICO DE ÁREA INTERATIVO - AGRUPADO POR MÊS */}
            <div className="grid gap-6 lg:grid-cols-7">
                <Card className="sm:col-span-4">
                    <CardHeader className="flex flex-col items-start gap-2 space-y-0 border-b py-5 sm:flex-row sm:items-center">
                        <div className="grid flex-1 gap-1">
                            <CardTitle>Atividades no Tempo</CardTitle>
                            <CardDescription>Avaliações e fiscalizações mensais</CardDescription>
                        </div>
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-[160px] rounded-lg sm:ml-auto" aria-label="Select a value">
                                <SelectValue placeholder="Selecione o período" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="24m" className="rounded-lg">Últimos 2 anos</SelectItem>
                                <SelectItem value="12m" className="rounded-lg">Últimos 12 meses</SelectItem>
                                <SelectItem value="6m" className="rounded-lg">Últimos 6 meses</SelectItem>
                                <SelectItem value="3m" className="rounded-lg">Últimos 3 meses</SelectItem>
                                <SelectItem value="1m" className="rounded-lg">Últimos 30 dias</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                        <ChartContainer config={chartConfigTimeline} className="aspect-auto h-[300px] w-full">
                            <LineChart data={monthlyTimelineData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    minTickGap={20}
                                    tickFormatter={(value) => {
                                        const [year, m] = value.split('-');
                                        return `${m.padStart(2,'0')}/${year}`;
                                    }}
                                />
                                <YAxis allowDecimals={false} />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent
                                        labelFormatter={(value) => {
                                            const [year, m] = value.split('-');
                                            return `${m.padStart(2,'0')}/${year}`;
                                        }}
                                        indicator="dot"
                                    />}
                                />
                                <Line type="monotone" dataKey="avaliacoes" stroke="var(--color-avaliacoes)" strokeWidth={2} dot />
                                <Line type="monotone" dataKey="fiscalizacoes" stroke="var(--color-fiscalizacoes)" strokeWidth={2} dot />
                                <ChartLegend content={<ChartLegendContent />} />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <div className="md:col-span-3 flex flex-col">
                    <Card>
                        <CardHeader>
                            <CardTitle>Status de Fiscalização</CardTitle>
                            <CardDescription>Total de imóveis por status (prazo de 2 anos)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfigStatusFiscalizacao}>
                                <BarChart accessibilityLayer data={dataStatusFiscalizacao} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 10 }} barSize={35}>
                                    <CartesianGrid horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" hide />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                    <Legend
                                    payload={[
                                        { value: chartConfigStatusFiscalizacao.emDia.label, type: "square", color: chartConfigStatusFiscalizacao.emDia.color },
                                        { value: chartConfigStatusFiscalizacao.aVencer.label, type: "square", color: chartConfigStatusFiscalizacao.aVencer.color },
                                        { value: chartConfigStatusFiscalizacao.vencido.label, type: "square", color: chartConfigStatusFiscalizacao.vencido.color },
                                        { value: chartConfigStatusFiscalizacao.nuncaFiscalizado.label, type: "square", color: chartConfigStatusFiscalizacao.nuncaFiscalizado.color },
                                    ]}
                                    />
                                    <Bar dataKey="emDia" stackId="a" fill={chartConfigStatusFiscalizacao.emDia.color} radius={[4, 0, 0, 4]}
                                    onClick={() => { setSelectedStatus("emDia"); setDrillImoveis(getImoveisPorStatus("emDia")); }}
                                    />
                                    <Bar dataKey="aVencer" stackId="a" fill={chartConfigStatusFiscalizacao.aVencer.color}
                                        onClick={() => { setSelectedStatus("aVencer"); setDrillImoveis(getImoveisPorStatus("aVencer")); }}
                                    />
                                    <Bar dataKey="vencido" stackId="a" fill={chartConfigStatusFiscalizacao.vencido.color}
                                        onClick={() => { setSelectedStatus("vencido"); setDrillImoveis(getImoveisPorStatus("vencido")); }}
                                    />
                                    <Bar dataKey="nuncaFiscalizado" stackId="a" fill={chartConfigStatusFiscalizacao.nuncaFiscalizado.color} radius={[0, 4, 4, 0]}
                                        onClick={() => { setSelectedStatus("nuncaFiscalizado"); setDrillImoveis(getImoveisPorStatus("nuncaFiscalizado")); }}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                    {/* Drill Down Modal/List para Município, Regime e Status */}
                    {(selectedStatus || selectedMunicipio || selectedRegimeCard) && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-4 relative">
                        <button className="absolute top-4 right-6 text-lg" onClick={() => {
                            setSelectedStatus(null);
                            setSelectedMunicipio(null);
                            setSelectedRegimeCard(null);
                            setDrillImoveis([]);
                        }}>Fechar</button>
                        <h2 className="text-xl font-bold mb-2">
                            {selectedStatus && (<>Imóveis - {chartConfigStatusFiscalizacao[selectedStatus]?.label || selectedStatus}</>)}
                            {selectedMunicipio && (<>Imóveis no Município - {selectedMunicipio}</>)}
                            {selectedRegimeCard && (<>Imóveis - {selectedRegimeCard}</>)}
                        </h2>
                        <ul className="max-h-[400px] overflow-y-auto">
                            {drillImoveis.length === 0 ? (
                            <li>Nenhum imóvel encontrado.</li>
                            ) : (
                            drillImoveis.map(imovel => (
                                <li key={imovel.idimovel} className="py-2 border-b">
                                <strong>{imovel.nome}</strong> - {imovel.matricula} - {imovel.endereco}
                                </li>
                            ))
                            )}
                        </ul>
                        </div>
                    </div>
                    )}      
                </div>
            </div>
        </main>
        </TooltipProvider>
    );
}
