// Este arquivo servirá como um dicionário central para as estruturas de dados do seu projeto.

export type Imagem = { 
  id?: number; 
  url: string; 
  ordem: number; 
  file?: File; 
  isNew?: boolean; 
  isdefault?: boolean; 
  nomearquivo?: string; 
};

export type Fiscalizacao = { 
  id?: number; 
  idimovel: number; 
  datafiscalizacao: string; 
  condicoes: string; 
  observacoes?: string; 
  fiscalizador: string; 
};

export type Avaliacao = { 
  id?: number; 
  idimovel: number; 
  dataavaliacao: string; 
  novovalor: string; 
  observacoes?: string; 
  avaliador: string; 
};

export type HstUnidadeGestora = { 
  id: number; 
  idunidadegestora: number; 
  dtinicio: string; 
  dtfim?: string; 
};

export type HstRegimeUtilizacao = { 
  id: number; 
  idregimeutilizacao: number; 
  dtinicio: string; 
  dtfim?: string; 
};

export type Imovel = { 
  idimovel?: number; 
  nome: string; 
  matricula: string; 
  dataimovel: string; 
  valorimovel: string; 
  ripimovel: string; 
  riputilizacao: string; 
  situacao?: boolean; 
  idpais?: number; 
  idestado?: number; 
  idmunicipio?: number; 
  cep?: string; 
  endereco: string; 
  numero?: string; 
  complemento?: string; 
  latitude?: number; 
  longitude?: number; 
  email: string; 
  nomecartorio: string; 
  nprocesso: string; 
  ocupante: string; 
  idregimeutilizacao?: number; 
  destinado?: boolean;
  idunidadegestora?: number; 
  areaconstruida?: string; 
  areaterreno?: string; 
  imagens: Imagem[]; 
  fiscalizacoes?: Fiscalizacao[];
  avaliacoes?: Avaliacao[];
  hstUnidades?: HstUnidadeGestora[];
  hstRegimes?: HstRegimeUtilizacao[];
};

export type LookupItem = { 
  id: number; 
  nome: string; 
  descricao?: string; 
  uf?: string; 
};