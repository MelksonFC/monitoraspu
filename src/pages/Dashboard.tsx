import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, Sector, XAxis, YAxis, LabelList, Label as RechartsLabel } from 'recharts';
import type { PieSectorDataItem } from "recharts/types/polar/Pie"
import type { Imovel, Fiscalizacao, Avaliacao } from '../types';

// ÍCONES para os cards de KPI
import { Library, ClipboardList, LandPlot, Building2, CircleDollarSign, Settings, Palette } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "../AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

// --- TEMAS DISPONÍVEIS ---
const themes = [
    { name: "theme-blue", label: "Azul", color: "#007bff" },
    { name: "theme-green", label: "Verde", color: "#28a745" },
    { name: "theme-orange", label: "Laranja", color: "#fd7e14" },
    { name: "theme-dark", label: "Escuro", color: "#343a40" },
];

// --- FUNÇÕES UTILITÁRIAS ---
// Função para aplicar o tema ao elemento raiz do documento
const applyTheme = (themeName: string) => {
    document.documentElement.setAttribute('data-theme', themeName);
};

const formatFullNumber = (num: number): string => {
    return num.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
};

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

// Função para calcular intervalo de datas a partir do filtro
function getDateRangeFromTimeRange(range: string) {
    const now = new Date();
    let start = new Date(now);
    if (range.endsWith("m")) {
        const months = parseInt(range.replace("m", ""), 10);
        start.setMonth(now.getMonth() - months);
    } else if (range.endsWith("d")) {
        const days = parseInt(range.replace("d", ""), 10);
        start.setDate(now.getDate() - days);
    }
    return { start, end: now };
}

// Função para agrupar por mês
function groupActivitiesByMonth(avaliacoes: Avaliacao[], fiscalizacoes: Fiscalizacao[], timeRange: string) {
    const { start, end } = getDateRangeFromTimeRange(timeRange);
    const monthlyMap: Record<string, { avaliacoes: number, fiscalizacoes: number }> = {};

    for (const item of avaliacoes) {
        if (!item.dataavaliacao) continue;
        const date = new Date(item.dataavaliacao);
        if (date < start || date > end) continue;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[key]) monthlyMap[key] = { avaliacoes: 0, fiscalizacoes: 0 };
        monthlyMap[key].avaliacoes += 1;
    }
    for (const item of fiscalizacoes) {
        if (!item.datafiscalizacao) continue;
        const date = new Date(item.datafiscalizacao);
        if (date < start || date > end) continue;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[key]) monthlyMap[key] = { avaliacoes: 0, fiscalizacoes: 0 };
        monthlyMap[key].fiscalizacoes += 1;
    }
    return Object.entries(monthlyMap)
        .map(([key, values]) => ({
            month: key,
            ...values
        }))
        .sort((a, b) => new Date(a.month + '-01').getTime() - new Date(b.month + '-01').getTime());
}

// --- DASHBOARD ---
export default function ShadcnDashboard() {
    // Hooks de Estado
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

    // Drill Down
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [drillImoveis, setDrillImoveis] = useState<Imovel[]>([]);
    const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);
    const [selectedRegimeCard, setSelectedRegimeCard] = useState<string | null>(null);

    // Estados para o menu de temas
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [currentTheme, setCurrentTheme] = useState("theme-blue"); // Tema padrão inicial

    // Função para alterar e salvar o tema
    const handleThemeChange = async (newThemeName: string) => {
        if (!usuario?.id) {
            console.warn("ID do usuário não encontrado para salvar o tema.");
            return;
        }
        
        applyTheme(newThemeName);
        setCurrentTheme(newThemeName);

        try {
            await axios.put(`${API_URL}/api/userpreferences/${usuario.id}`, { themepreference: newThemeName });
        } catch (error) {
            console.error("Falha ao salvar preferência de tema:", error);
            // Opcional: Reverter para o tema anterior se a chamada falhar
        }
    };

    useEffect(() => {
        if (!usuario?.id) {
            setLoading(false); // Para de carregar se não houver usuário
            return;
        }
        const fetchData = async () => {
            try {
                const [imoveisRes, municipiosRes, regimesRes, fiscalizacoesRes, avaliacoesRes, themeRes] = await Promise.all([
                    axios.get(`${API_URL}/api/imoveis?situacao=true`),
                    axios.get(`${API_URL}/api/municipios`),
                    axios.get(`${API_URL}/api/regimeutilizacao`),
                    axios.get(`${API_URL}/api/fiscalizacoes`),
                    axios.get(`${API_URL}/api/avaliacoes`),
                    axios.get(`${API_URL}/api/userpreferences/${usuario.id}`),
                ]);

                // Aplica o tema buscado do banco de dados
                if (themeRes.data && themeRes.data.themepreference) {
                    const savedTheme = themeRes.data.themepreference;
                    setCurrentTheme(savedTheme);
                    applyTheme(savedTheme);
                } else {
                    applyTheme(currentTheme); // Aplica o tema padrão se não houver salvo
                }
                
                const imoveisData = Array.isArray(imoveisRes.data) ? imoveisRes.data : [];
                const regimesData = Array.isArray(regimesRes.data) ? regimesRes.data : [];
                setImoveis(imoveisData);
                setMunicipios(Array.isArray(municipiosRes.data) ? municipiosRes.data : []);
                setRegimes(regimesData);
                setFiscalizacoes(Array.isArray(fiscalizacoesRes.data) ? fiscalizacoesRes.data : []);
                setAcaliacoes(Array.isArray(avaliacoesRes.data) ? avaliacoesRes.data : []);
                
                if (regimesData.length > 0 && imoveisData.length > 0) {
                     const regimeMap = new Map(regimesData.map((r: any) => [r.id, r.descricao || r.nome]));
                     const imoveisPorRegime = imoveisData.reduce<Record<string, number>>((acc, imovel) => {
                        const nomeRegime = imovel.idregimeutilizacao ? (regimeMap.get(imovel.idregimeutilizacao) || `ID Reg. ${imovel.idregimeutilizacao}`) : 'Não especificado';
                        acc[nomeRegime] = (acc[nomeRegime] || 0) + 1;
                        return acc;
                    }, {});
                    const sortedRegimes = Object.entries(imoveisPorRegime).sort((a, b) => b[1] - a[1]);
                    if (sortedRegimes.length > 0) setActiveRegime(sortedRegimes[0][0]);
                }
            } catch (e: unknown) {
                setError(e instanceof Error ? `Falha ao buscar dados: ${e.message}` : "Falha ao buscar dados para o dashboard. Erro desconhecido.");
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [usuario?.id]);

    // --- PROCESSAMENTO E CONFIGURAÇÃO DE DADOS ---
    const municipioMap = new Map(municipios.map((m: any) => [m.idmunicipio, m.nome]));
    const regimeMap = new Map(regimes.map((r: any) => [r.id, r.descricao || r.nome]));
    const totalRipImoveis = new Set(imoveis.map((i: Imovel) => i.ripimovel).filter(Boolean)).size;
    const totalRipUtilizacao = new Set(imoveis.map((i: Imovel) => i.riputilizacao).filter(Boolean)).size;
    const totalAreaTerreno = imoveis.reduce((sum: number, i: Imovel) => sum + (parseFloat(i.areaterreno as any) || 0), 0);
    const totalAreaConstruida = imoveis.reduce((sum: number, i: Imovel) => sum + (parseFloat(i.areaconstruida as any) || 0), 0);
    const valorTotalImoveis = imoveis.reduce((sum: number, i: Imovel) => sum + (parseFloat(i.valorimovel as any) || 0), 0);
    const formattedAreaConstruida = formatArea(totalAreaConstruida);
    const formattedAreaTerreno = formatArea(totalAreaTerreno);
    const totalSemEdificacao = imoveis.filter(i => !i.areaconstruida || Number(i.areaconstruida) === 0).length;
    const mediaValorImoveis = imoveis.length > 0 ? (valorTotalImoveis / imoveis.length) : 0;

    const imoveisPorMunicipio = imoveis.reduce<Record<string, number>>((acc, imovel: Imovel) => {
        const nomeMunicipio = imovel.idmunicipio ? (municipioMap.get(imovel.idmunicipio) || `ID Mun. ${imovel.idmunicipio}`) : 'Não especificado';
        acc[nomeMunicipio] = (acc[nomeMunicipio] || 0) + 1;
        return acc;
    }, {});
    const dataMunicipio = Object.entries(imoveisPorMunicipio).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    
    const chartConfigMunicipio: ChartConfig = {
      value: { label: "Nº de Imóveis", color: "hsl(var(--chart-1))" },
      label: { color: "hsl(var(--card))" },
    };

    const imoveisPorRegime = imoveis.reduce<Record<string, number>>((acc, imovel: Imovel) => {
        const nomeRegime = imovel.idregimeutilizacao ? (regimeMap.get(imovel.idregimeutilizacao) || `ID Reg. ${imovel.idregimeutilizacao}`) : 'Não especificado';
        acc[nomeRegime] = (acc[nomeRegime] || 0) + 1;
        return acc;
    }, {});

    const dataRegime = Object.entries(imoveisPorRegime).map(([name, value]) => ({ name, value, fill: `var(--color-${name.replace(/\s+/g, '-').toLowerCase()})` })).sort((a,b) => b.value - a.value);
    const totalImoveisRegime = dataRegime.reduce((sum, item) => sum + item.value, 0);
    const regimesDestinadosIds = regimes.filter((r: any) => r.destinado === true).map((r: any) => r.id);
    
    const chartConfigRegime = dataRegime.reduce<ChartConfig>((acc, { name }, index) => {
        const key = name.replace(/\s+/g, '-').toLowerCase();
        acc[key] = { label: name, color: `hsl(var(--chart-${(index % 4) + 1}))` };
        return acc;
    }, {});

    const activeIndexRegime = React.useMemo(() => dataRegime.findIndex((item) => item.name === activeRegime), [activeRegime, dataRegime]);
    const regimeNames = React.useMemo(() => dataRegime.map((item) => item.name), [dataRegime]);

    const totalVago = dataRegime.find(r => r.name === 'Vago para Uso')?.value || 0;
    const totalEmRegularizacao = dataRegime.find(r => r.name === 'Em Regularização')?.value || 0;
    const totalDestinados = imoveis.filter(i => regimesDestinadosIds.includes(i.idregimeutilizacao)).length;
    
    // --- AGRUPAMENTO POR MÊS PARA O GRÁFICO DE ÁREA ---
    const monthlyTimelineData = React.useMemo(() => {
        return groupActivitiesByMonth(avaliacoes, fiscalizacoes, timeRange);
    }, [avaliacoes, fiscalizacoes, timeRange]);

    const chartConfigTimeline: ChartConfig = {
      avaliacoes: { label: "Avaliações", color: "hsl(var(--chart-1))" },
      fiscalizacoes: { label: "Fiscalizações", color: "hsl(var(--chart-2))" },
    };

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

    const chartConfigStatusFiscalizacao: ChartConfig = {
        emDia: { label: "Em Dia", color: "hsl(var(--blue-light))" },
        aVencer: { label: "A Vencer", color: "hsl(var(--accent-orange))" },
        vencido: { label: "Vencido", color: "hsl(0 100% 65.4%)" },
        nuncaFiscalizado: { label: "Nunca Fiscalizado", color: "hsl(var(--muted))" },
    };

    // ---- DRILL DOWN: Lista de imóveis por status ----
    function getImoveisPorStatus(status: string): Imovel[] {
        const hoje = new Date();
        const prazoVencido = new Date(); prazoVencido.setFullYear(hoje.getFullYear() - 2);
        const prazoAVencer = new Date(); prazoAVencer.setFullYear(hoje.getFullYear() - 2); prazoAVencer.setMonth(hoje.getMonth() + 6);

        // Mapa: idimovel => data da última fiscalização
        const ultimasFiscalizacoes = new Map<number, string>();
        for (const fisc of fiscalizacoes) {
            if (fisc.idimovel) {
                const dataAtual = ultimasFiscalizacoes.get(fisc.idimovel);
                if (!dataAtual || new Date(fisc.datafiscalizacao) > new Date(dataAtual)) ultimasFiscalizacoes.set(fisc.idimovel, fisc.datafiscalizacao);
            }
        }

        return imoveis.filter(imovel => {
            const ultimaFiscalizacao = imovel.idimovel ? ultimasFiscalizacoes.get(imovel.idimovel) : undefined;
            if (status === "nuncaFiscalizado") {
                return !ultimaFiscalizacao;
            }
            if (!ultimaFiscalizacao) return false;
            const dataFiscalizacao = new Date(ultimaFiscalizacao);
            if (status === "vencido") return dataFiscalizacao < prazoVencido;
            if (status === "aVencer") return dataFiscalizacao < prazoAVencer && dataFiscalizacao >= prazoVencido;
            if (status === "emDia") return dataFiscalizacao >= prazoAVencer;
            return false;
        });
    }

    // ---- DRILL DOWN: Lista de imóveis por município ----
    function getImoveisPorMunicipio(municipioNome: string): Imovel[] {
        return imoveis.filter(imovel => {
            const nomeMunicipio = imovel.idmunicipio ? (municipioMap.get(imovel.idmunicipio) || `ID Mun. ${imovel.idmunicipio}`) : 'Não especificado';
            return nomeMunicipio === municipioNome;
        });
    }

    // ---- DRILL DOWN: Lista de imóveis por regime ----
    function getImoveisPorRegime(regimeNome: string): Imovel[] {
        return imoveis.filter(imovel => {
            const nomeRegime = imovel.idregimeutilizacao ? (regimeMap.get(imovel.idregimeutilizacao) || `ID Reg. ${imovel.idregimeutilizacao}`) : 'Não especificado';
            return nomeRegime === regimeNome;
        });
    }

    function formatPieCenterText(text: string, maxLength: number = 16): string[] {
    // Se o texto for curto, retorna como está
    if (text.length <= maxLength) return [text];
    // Tenta dividir por espaço para melhor quebra
    const words = text.split(' ');
    let line1 = "";
    let line2 = "";
    for (const word of words) {
        if ((line1 + ' ' + word).length <= maxLength) {
        line1 += (line1 ? ' ' : '') + word;
        } else {
        line2 += (line2 ? ' ' : '') + word;
        }
    }
    // Se a segunda linha ainda ficou muito longa, faz uma abreviação simples
    if (line2.length > maxLength) {
        line2 = line2.slice(0, maxLength - 1) + '…';
    }
    return [line1, line2];
    }

    if (loading) return <div className="flex items-center justify-center h-screen"><p>Carregando dados...</p></div>;
    if (error) return <div className="container mx-auto p-8"><Card className="bg-destructive text-destructive-foreground"><CardHeader><CardTitle>Erro</CardTitle></CardHeader><CardContent>{error}</CardContent></Card></div>;

    return (
        <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">
            {/* Menu de Personalização de Tema */}
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                    className="p-2 rounded-full bg-card text-card-foreground shadow-md hover:bg-muted"
                    aria-label="Personalizar Tema"
                >
                    <Settings className="h-6 w-6" />
                </button>
                {isThemeMenuOpen && (
                    <div className="absolute top-12 right-0 w-64 rounded-lg bg-card shadow-lg border p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Palette className="h-5 w-5" />
                            <h3 className="font-semibold">Escolha um Tema</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {themes.map((theme) => (
                                <button
                                    key={theme.name}
                                    onClick={() => handleThemeChange(theme.name)}
                                    className={`p-2 rounded-md text-sm text-center font-medium border-2 ${currentTheme === theme.name ? 'border-primary' : 'border-transparent'}`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="block w-4 h-4 rounded-full" style={{ backgroundColor: theme.color }}></span>
                                        <span>{theme.label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {/* Linha de KPIs principais */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                <Card className="bg-gradient-to-br from-[hsl(var(--blue-primary))] to-[hsl(var(--blue-light))] text-primary-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">RIP Imóvel</CardTitle><Library className="h-4 w-4 text-white/80" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{totalRipImoveis.toLocaleString('pt-BR')}</div></CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-[hsl(var(--blue-primary))] to-[hsl(var(--blue-light))] text-primary-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">RIP Utilização</CardTitle><ClipboardList className="h-4 w-4 text-white/80" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{totalRipUtilizacao.toLocaleString('pt-BR')}</div></CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-[hsl(var(--blue-primary))] to-[hsl(var(--blue-light))] text-primary-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Área Terreno</CardTitle>
                        <LandPlot className="h-4 w-4 text-white/80" />
                    </CardHeader>
                    <CardContent className="relative pb-6">
                        <div className="text-2xl font-bold"
                            title={formatFullNumber(Number(totalAreaTerreno))}
                        >
                            {formatCompactNumber(Number(totalAreaTerreno), { style: 'currency' })} 
                            <span className="text-xs opacity-80">
                                {formattedAreaTerreno.unit}
                            </span>
                        </div>
                        {/* Rodapé flutuante da informação extra */}
                        <div
                            className="absolute bottom-2 right-4 text-xs px-2 py-0.5 rounded text-white/80"
                            
                        >
                            Sem edificação: {totalSemEdificacao}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-[hsl(var(--blue-primary))] to-[hsl(var(--blue-light))] text-primary-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Área Construída</CardTitle>
                        <Building2 className="h-4 w-4 text-white/80" /></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold"
                            title={formatFullNumber(Number(totalAreaConstruida))}
                        >
                            {formatCompactNumber(Number(totalAreaConstruida), { style: 'currency' })}
                            <span className="text-xs opacity-80">
                                {formattedAreaConstruida.unit}
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-[hsl(var(--blue-primary))] to-[hsl(var(--blue-light))] text-primary-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Total Imóveis</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-white/80" />
                    </CardHeader>
                    <CardContent className="relative pb-6">
                        <div className="text-2xl font-bold"
                            title={formatFullNumber(Number(valorTotalImoveis))}
                        >
                            {formatCompactNumber(valorTotalImoveis, { style: 'currency' })}</div>
                        <div
                            className="absolute bottom-2 right-4 text-xs px-2 py-0.5 rounded text-white/80"
                            
                        >
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
                        <ChartContainer 
                            config={chartConfigMunicipio} 
                            className="w-full" 
                            style={{
                            maxHeight: "460px",
                            overflowY: "auto",
                            }}
                        >
                            <BarChart accessibilityLayer
                                data={dataMunicipio}
                                layout="vertical"
                                margin={{ left: 1, right: 0.5 }}
                                height={Math.max(260, dataMunicipio.length * 45)}
                            >
                                <CartesianGrid horizontal={false} />
                                <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} hide />
                                <XAxis dataKey="value" type="number" hide />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" hideLabel />} />
                                <Bar dataKey="value"
                                    fill="var(--color-value)"
                                    radius={4}
                                    onClick={(_data, index) => {
                                    const municipio = dataMunicipio[index].name;
                                    setSelectedMunicipio(municipio);
                                    setDrillImoveis(getImoveisPorMunicipio(municipio));
                                    }}
                                >
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
                            <SelectTrigger className="ml-auto h-7 w-[150px] rounded-lg pl-2.5" aria-label="Selecione o Regime"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent align="end" className="rounded-xl">
                                {regimeNames.map((key) => {
                                    const configKey = key.replace(/\s+/g, '-').toLowerCase();
                                    const config = chartConfigRegime[configKey as keyof typeof chartConfigRegime];
                                    if (!config) return null;
                                    return (<SelectItem key={key} value={key} className="rounded-lg [&_span]:flex"><div className="flex items-center gap-2 text-xs"><span className="flex h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: config.color }} />{config?.label}</div></SelectItem>)
                                })}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="flex flex-1 justify-center pb-0">
                        <ChartContainer config={chartConfigRegime} className="mx-auto aspect-square w-full max-w-[300px] min-h-24">
                            <PieChart>
                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                <Pie data={dataRegime} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5} activeIndex={activeIndexRegime}
                                    activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (<g><Sector {...props} outerRadius={outerRadius + 10} /><Sector {...props} outerRadius={outerRadius + 25} innerRadius={outerRadius + 12} /></g>)}>
                                    <RechartsLabel
                                    content={({ viewBox }) => {
                                        // Type guard para garantir que cx/cy existem
                                        if (!viewBox || typeof (viewBox as any).cx !== "number" || typeof (viewBox as any).cy !== "number") return null;
                                        const cx = (viewBox as any).cx;
                                        const cy = (viewBox as any).cy;
                                        const activeData = dataRegime[activeIndexRegime];
                                        const percentage = totalImoveisRegime > 0 && activeData ? (activeData.value / totalImoveisRegime) * 100 : 0;
                                        const lines = formatPieCenterText(activeRegime, 16);

                                        return (
                                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                                            <tspan x={cx} y={cy - 12} className="fill-foreground text-3xl font-bold">{percentage.toFixed(1)}%</tspan>
                                            {lines.map((line, idx) => (
                                            <tspan
                                                key={idx}
                                                x={cx}
                                                y={cy + idx * 18 + 10}
                                                className="fill-muted-foreground"
                                                fontSize={12}
                                            >
                                                {line}
                                            </tspan>
                                            ))}
                                        </text>
                                        );
                                    }}
                                    />
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                    <div className="grid grid-cols-3 md:gap-8 md:p-8">
                        <Card className="bg-gradient-to-br from-[hsl(var(--gray-dark))] to-[hsl(var(--gray-light))] text-primary-foreground" style={{ cursor: "pointer" }} onClick={() => {
                          setSelectedRegimeCard('Vago para Uso');
                          setDrillImoveis(getImoveisPorRegime('Vago para Uso'));
                        }}>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Vago para Uso</CardTitle></CardHeader>
                            <CardContent><p className="text-2xl font-bold">{totalVago}</p></CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-[hsl(var(--gray-dark))] to-[hsl(var(--gray-light))] text-primary-foreground" style={{ cursor: "pointer" }} onClick={() => {
                          setSelectedRegimeCard('Em Regularização');
                          setDrillImoveis(getImoveisPorRegime('Em Regularização'));
                        }}>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Em Regularização</CardTitle></CardHeader>
                            <CardContent><p className="text-2xl font-bold">{totalEmRegularizacao}</p></CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-[hsl(var(--gray-dark))] to-[hsl(var(--gray-light))] text-primary-foreground" style={{ cursor: "pointer" }} onClick={() => {
                        setSelectedRegimeCard('Destinados');
                        setDrillImoveis(imoveis.filter(i => regimesDestinadosIds.includes(i.idregimeutilizacao)));
                        }}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Destinados</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{totalDestinados}</p>
                            </CardContent>
                        </Card>
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
                                    <Bar dataKey="emDia" stackId="a" fill="var(--color-emDia)" radius={[4, 0, 0, 4]}
                                      onClick={() => {
                                        setSelectedStatus("emDia");
                                        setDrillImoveis(getImoveisPorStatus("emDia"));
                                      }}
                                    />
                                    <Bar dataKey="aVencer" stackId="a" fill="var(--color-aVencer)"
                                      onClick={() => {
                                        setSelectedStatus("aVencer");
                                        setDrillImoveis(getImoveisPorStatus("aVencer"));
                                      }}
                                    />
                                    <Bar dataKey="vencido" stackId="a" fill="var(--color-vencido)"
                                      onClick={() => {
                                        setSelectedStatus("vencido");
                                        setDrillImoveis(getImoveisPorStatus("vencido"));
                                      }}
                                    />
                                    <Bar dataKey="nuncaFiscalizado" stackId="a" fill="var(--color-nuncaFiscalizado)" radius={[0, 4, 4, 0]}
                                      onClick={() => {
                                        setSelectedStatus("nuncaFiscalizado");
                                        setDrillImoveis(getImoveisPorStatus("nuncaFiscalizado"));
                                      }}
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
    );
}