# Onboarding de Desenvolvimento

## Resumo rápido da arquitetura

- Frontend: React + TypeScript + Vite em src.
- Backend: Express em server, com rotas REST em server/routes.
- Banco: PostgreSQL, com uso misto de pg (SQL direto) e Sequelize (models).
- Autenticação/conta: rotas em server/login.js e parte de usuários em server/index.js.

## Onde fica cada camada

- Entrada frontend: src/main.tsx e src/App.tsx.
- Service HTTP base: src/services/api.ts.
- Chamadas HTTP reais: majoritariamente espalhadas em pages/components (axios e fetch diretos).
- Estado global: Context API (AuthContext, ThemeContext, LayoutContext).
- Actions no estilo Redux: não existem no projeto hoje.
- Entrada backend: server/index.js.
- Endpoints por domínio: server/routes/\*.js.
- Configuração de banco e env: server/config/database.js, server/pool.js, server/models/sequelize.js.

## Dependências necessárias para desenvolver

1. Node.js 20+ (recomendado: LTS atual).
2. npm (o projeto usa package-lock.json; gerenciador recomendado: npm).
3. Acesso a um PostgreSQL com schema/tabelas esperadas.
4. Opcional para fluxos de e-mail (ativação/reset): conta SMTP (Gmail) configurada por variáveis de ambiente.

## Gerenciador de pacotes

- Use npm.
- Motivo: existe package-lock.json no repositório, então npm garante instalação consistente com o lockfile.

## Variáveis de ambiente

Crie um arquivo .env na raiz do projeto com:

DB_USER=seu_usuario
DB_HOST=localhost
DB_NAME=seu_banco
DB_PASSWORD=sua_senha
DB_PORT=5432

PORT=10000
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:10000

EMAIL_USER=seu_email_smtp
EMAIL_PASS=sua_senha_ou_app_password

Observações:

- DB_HOST diferente de localhost ativa SSL automaticamente na config do backend.
- EMAIL_USER/EMAIL_PASS são necessários para envio de e-mails (ativação/reset).
- FRONTEND_URL é usado nos links enviados por e-mail.

## Como iniciar localmente

1. Para instalar dependências, rodar na pasta do projeto:
   npm install
2. Para subir backend (porta 10000), rodar na pasta do projeto:
   npm start
3. Em outro terminal, para subir frontend (porta 5173), rodar na pasta do projeto:
   npm run dev

Acesso local:

- Frontend: http://localhost:5173
- Backend: http://localhost:10000
- Healthcheck backend: GET http://localhost:10000/api/ping

## Endpoints principais

- Auth/conta: /api/login, /api/reset-solicitar, /api/reset-redefinir, /api/ativar
- Usuários: /api/usuarios, /api/usuarios/:id, /api/usuarios/:id/reenviar-ativacao
- Imóveis: /api/imoveis, /api/imoveis/:id, /api/imoveis/com-relacoes
- Lookups mapa: /api/lookups/paises-com-imoveis, /api/lookups/estados-com-imoveis, /api/lookups/municipios-com-imoveis
- Configurações por usuário: /api/userpreferences, /api/usertablesettings

## Informações relevantes para desenvolvimento

- Padrão atual de API client no frontend não está centralizado: existe src/services/api.ts, mas muitas telas usam axios/fetch direto.
- Backend mistura Sequelize e SQL direto; ao alterar regra de negócio, verifique ambos os pontos.
- Vite tem proxy de /api para http://localhost:10000 em vite.config.ts.
- README original era template do Vite; este guia e o README atualizado passam a refletir o projeto real.
