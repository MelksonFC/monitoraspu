# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

# Monitora SPU-RR

Aplicação web com frontend React/Vite e backend Express para gestão e visualização de imóveis.

## Stack

- Frontend: React 18, TypeScript, Vite, MUI, Tailwind.
- Backend: Node.js, Express, pg, Sequelize.
- Banco: PostgreSQL.

## Requisitos de desenvolvimento

1. Node.js 20+.
2. npm.
3. PostgreSQL acessível localmente ou remoto.
4. SMTP (opcional, necessário para fluxos de e-mail de ativação/reset).

## Gerenciador de pacotes

Use npm.

Motivo: o repositório versiona package-lock.json, garantindo reprodutibilidade das instalações com npm.

## Configuração de ambiente

Crie um arquivo .env na raiz do projeto:

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

Notas:

- DB_HOST diferente de localhost habilita SSL automaticamente para conexão com o banco.
- FRONTEND_URL é usado para geração de links de ativação/redefinição.
- EMAIL_USER/EMAIL_PASS são necessários para envio de e-mails.

## Como iniciar localmente

1. Instale dependências:
   npm install
2. Inicie o backend (porta 10000):
   npm start
3. Em outro terminal, inicie o frontend (porta 5173):
   npm run dev

## URLs locais

- Frontend: http://localhost:5173
- Backend: http://localhost:10000
- Ping da API: http://localhost:10000/api/ping

## Scripts npm

- npm run dev: inicia frontend Vite em desenvolvimento.
- npm start: inicia backend Express.
- npm run build: build de produção do frontend.
- npm run lint: validação de lint.

## Estrutura principal

- src: frontend.
- server: backend.
- server/routes: rotas REST.
- server/models: modelos Sequelize.
- server/config: configuração de banco.
- docs: documentação adicional.

## Endpoints principais

- Auth: /api/login, /api/reset-solicitar, /api/reset-redefinir, /api/ativar
- Usuários: /api/usuarios
- Imóveis: /api/imoveis, /api/imoveis/com-relacoes
- Lookups: /api/lookups/\*
- Preferências: /api/userpreferences, /api/usertablesettings

## Guia de onboarding detalhado

Veja o documento em docs/onboarding-desenvolvimento.md para visão arquitetural, mapa de camadas e observações práticas de manutenção.
