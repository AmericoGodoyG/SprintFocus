<p align="center">
  <img src="src/renderer/src/assets/icon.png" width="120" alt="SprintFocus Logo" />
</p>

<h1 align="center">📚 SprintFocus</h1>

<p align="center">
  <strong>Ambiente pessoal de foco e estudos com Pomodoro, Métricas de Evolução e Calendário</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33.2.0-47848F?style=for-the-badge&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

---

## 📖 Sobre o Projeto

**SprintFocus** é uma aplicação desktop construída com Electron que oferece um ambiente completo e integrado para estudos. Combina um timer Pomodoro configurável, sistema de foco e pausas, métricas detalhadas de evolução e calendário de sessões — tudo em uma interface moderna com tema escuro e claro.

---

## ✨ Funcionalidades

| Módulo | Descrição |
|---|---|
| 🍅 **Pomodoro Timer** | Timer de estudo com ciclos configuráveis (estudo, pausa curta, pausa longa), notificações nativas e controle de sessões |
| 🃏 **Flash Cards** | Criação manual ou gerada por IA, sistema de repetição espaçada com fator de facilidade e agendamento inteligente de revisão |
| 📊 **Métricas** | Dashboard com gráficos de tempo estudado, distribuição por matéria, streak de dias consecutivos e estatísticas de revisão |
| 📅 **Calendário** | Visualização mensal de todas as sessões de estudo com detalhes por dia |
| 📄 **PDFs** | Importação de documentos PDF com extração de texto e sumarização via IA |
| 🤖 **Integração com IA** | Suporte a Google Gemini e OpenAI para gerar resumos, flashcards e responder perguntas sobre o conteúdo |
| 💾 **Backup** | Exportação e importação do banco de dados para backup dos seus dados |
| 🎨 **Temas** | Suporte a tema claro e escuro com persistência de preferência |

---

## 🛠️ Tech Stack

### Core

| Tecnologia | Versão | Uso |
|---|---|---|
| [Electron](https://www.electronjs.org/) | 33.2.0 | Framework desktop multiplataforma |
| [electron-vite](https://electron-vite.org/) | 2.3.0 | Build tool otimizada para Electron |
| [electron-builder](https://www.electron.build/) | 25.1.8 | Empacotamento e distribuição |

### Frontend (Renderer)

| Tecnologia | Versão | Uso |
|---|---|---|
| [React](https://react.dev/) | 18.3.1 | Biblioteca de UI |
| [TypeScript](https://www.typescriptlang.org/) | 5.6.3 | Tipagem estática |
| [React Router DOM](https://reactrouter.com/) | 6.28.0 | Roteamento SPA |
| [Zustand](https://zustand-demo.pmnd.rs/) | 5.0.0 | Gerenciamento de estado |
| [Lucide React](https://lucide.dev/) | 0.460.0 | Biblioteca de ícones |
| CSS Modules | — | Estilização com escopo por componente |

### Backend (Main Process)

| Tecnologia | Versão | Uso |
|---|---|---|
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 11.7.0 | Banco de dados SQLite embarcado |
| [pdfjs-dist](https://mozilla.github.io/pdf.js/) | 4.8.69 | Extração de texto de PDFs |

### Integrações de IA

| Tecnologia | Versão | Uso |
|---|---|---|
| [@google/generative-ai](https://ai.google.dev/) | 0.21.0 | Google Gemini API |
| [openai](https://platform.openai.com/) | 4.73.0 | OpenAI API (GPT) |

---

## 🏗️ Arquitetura

O projeto segue a arquitetura padrão do Electron com **3 camadas isoladas** e comunicação via IPC (Inter-Process Communication):

```
┌─────────────────────────────────────────────────────────────────┐
│                        ELECTRON APP                             │
│                                                                 │
│  ┌──────────────────┐  IPC Bridge  ┌──────────────────────────┐ │
│  │   Main Process   │◄────────────►│    Renderer Process      │ │
│  │   (Node.js)      │  (invoke/    │    (Chromium)             │ │
│  │                  │   handle)    │                          │ │
│  │  ┌────────────┐  │              │  ┌────────────────────┐  │ │
│  │  │  Database   │  │              │  │   React + Router   │  │ │
│  │  │  (SQLite)   │  │              │  │   + Zustand        │  │ │
│  │  └────────────┘  │              │  └────────────────────┘  │ │
│  │  ┌────────────┐  │              │  ┌────────────────────┐  │ │
│  │  │ AI Service  │  │              │  │   Pages:           │  │ │
│  │  │ Gemini/GPT  │  │              │  │   - Pomodoro       │  │ │
│  │  └────────────┘  │              │  │   - Metrics         │  │ │
│  │  ┌────────────┐  │              │  │   - Calendar        │  │ │
│  │  │ PDF Parser  │  │              │  └────────────────────┘  │ │
│  │  └────────────┘  │              │  ┌────────────────────┐  │ │
│  │  ┌────────────┐  │              │  │   CSS Modules      │  │ │
│  │  │ Backup Svc  │  │              │  │   + Animations     │  │ │
│  │  └────────────┘  │              │  └────────────────────┘  │ │
│  └──────────────────┘              └──────────────────────────┘ │
│              ▲                                                  │
│              │                                                  │
│  ┌───────────┴────────┐                                         │
│  │  Preload Script     │                                        │
│  │  (Context Bridge)   │                                        │
│  │  Expõe API segura   │                                        │
│  │  via window.api     │                                        │
│  └────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Camadas

| Camada | Diretório | Responsabilidade |
|---|---|---|
| **Main Process** | `src/main/` | Lógica de backend — banco de dados, serviços de IA, parser de PDF, backup e gerenciamento de janelas |
| **Preload** | `src/preload/` | Bridge de segurança — expõe uma API tipada via `contextBridge` para o renderer, mantendo `contextIsolation` ativo |
| **Renderer** | `src/renderer/` | Interface de usuário — React com roteamento, estado global e estilização via CSS Modules |

### Padrões de Projeto

- **Repository Pattern** — Cada entidade do banco (`subjects`, `topics`, `sessions`, `flashcards`, `pdfs`, `settings`) possui um repositório dedicado em `src/main/database/repositories/`
- **Provider Pattern (IA)** — Interface `AIProvider` com implementações intercambiáveis (`GeminiProvider`, `OpenAIProvider`)
- **IPC Handlers** — Handlers organizados por domínio (`database.ipc`, `ai.ipc`, `pdf.ipc`, `settings.ipc`, `backup.ipc`, `notification.ipc`)
- **State Management** — Zustand para gerenciamento de estado leve no frontend (ex: tema)

### Banco de Dados (SQLite)

```
subjects ──┐
            ├──► topics
            ├──► study_sessions
            ├──► flashcards ──► flashcard_reviews
            └──► pdf_documents

app_settings (key-value)
```

Chaves API são armazenadas com criptografia via `electron.safeStorage`.

---

## 📁 Estrutura de Diretórios

```
AppPomodoro/
├── build/                          # Recursos de build (ícone, etc.)
├── scripts/
│   ├── create-icon.ps1             # Script para gerar ícone
│   └── e2e_test.js                 # Testes end-to-end
├── src/
│   ├── main/                       # 🔧 Processo principal (Node.js)
│   │   ├── index.ts                # Entry point — cria janela, inicia DB e IPC
│   │   ├── database/
│   │   │   ├── connection.ts       # Conexão SQLite (WAL mode)
│   │   │   ├── migrations.ts       # Schema e migrações
│   │   │   └── repositories/      # Repositórios por entidade
│   │   │       ├── subjects.repo.ts
│   │   │       ├── topics.repo.ts
│   │   │       ├── sessions.repo.ts
│   │   │       ├── flashcards.repo.ts
│   │   │       ├── pdfs.repo.ts
│   │   │       └── settings.repo.ts
│   │   ├── ipc/                    # Handlers IPC por domínio
│   │   │   ├── index.ts
│   │   │   ├── database.ipc.ts
│   │   │   ├── ai.ipc.ts
│   │   │   ├── pdf.ipc.ts
│   │   │   ├── settings.ipc.ts
│   │   │   ├── backup.ipc.ts
│   │   │   └── notification.ipc.ts
│   │   └── services/
│   │       └── ai/                 # Provedores de IA
│   │           ├── ai-provider.interface.ts
│   │           ├── gemini.provider.ts
│   │           ├── openai.provider.ts
│   │           └── prompts.ts
│   ├── preload/                    # 🔒 Script de preload
│   │   ├── index.ts                # Context Bridge (window.api)
│   │   └── index.d.ts             # Tipos do preload
│   └── renderer/                   # 🎨 Processo de renderização (React)
│       ├── index.html
│       └── src/
│           ├── main.tsx            # Entry point React
│           ├── App.tsx             # Roteamento principal
│           ├── env.d.ts
│           ├── api/
│           │   └── browserFallback.ts  # Fallback para execução no browser
│           ├── assets/
│           │   ├── icon.png
│           │   └── styles/
│           │       ├── globals.css      # Variáveis e estilos globais
│           │       └── animations.css   # Animações CSS
│           ├── components/
│           │   └── layout/
│           │       ├── MainLayout.tsx
│           │       ├── MainLayout.module.css
│           │       ├── StudyFlowSlider.tsx
│           │       └── StudyFlowSlider.module.css
│           ├── hooks/
│           │   └── useTheme.ts     # Hook Zustand para tema
│           └── pages/
│               ├── Pomodoro.tsx    # Página do timer
│               ├── Pomodoro.module.css
│               ├── Metrics.tsx     # Página de métricas
│               ├── Metrics.module.css
│               ├── Calendar.tsx    # Página de calendário
│               └── Calendar.module.css
├── electron.vite.config.ts         # Configuração do electron-vite
├── tsconfig.json                   # Config TypeScript raiz
├── tsconfig.node.json              # Config TS para main/preload
├── tsconfig.web.json               # Config TS para renderer
└── package.json
```

---

## 🚀 Como Iniciar

### Pré-requisitos

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Windows** (build atual configurado para Windows x64)

### Instalação

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd AppPomodoro

# 2. Instale as dependências
npm install
```

> **Nota:** O script `postinstall` roda automaticamente e configura o `better-sqlite3` para funcionar com o Electron.

### Desenvolvimento

```bash
# Inicia o app em modo de desenvolvimento com hot-reload
npm run dev
```

Isso abre a aplicação Electron com:
- **Hot Module Replacement (HMR)** no renderer
- **DevTools** disponível
- Banco de dados SQLite criado automaticamente em `%APPDATA%/sprintfocus/sprintfocus.db`

### Build de Produção

```bash
# Compila o projeto
npm run build

# Gera o instalador Windows (NSIS)
npm run dist
```

O instalador será gerado na pasta `release/`.

### Preview

```bash
# Roda o build de produção localmente
npm run preview
```

### Testes E2E

```bash
npm run test:e2e
```

---

## ⚙️ Configuração de IA

Para utilizar as funcionalidades de IA (resumos, geração de flashcards, perguntas), configure uma API key dentro do app:

1. Abra as configurações do app
2. Selecione o provedor: **Google Gemini** ou **OpenAI**
3. Insira sua API key (armazenada com criptografia local via `safeStorage`)

| Provedor | Modelo Padrão |
|---|---|
| Google Gemini | `gemini-2.0-flash` |
| OpenAI | `gpt-4o-mini` |

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia em modo desenvolvimento com hot-reload |
| `npm run build` | Compila o projeto para produção |
| `npm run preview` | Executa o build de produção localmente |
| `npm run dist` | Gera instalador Windows (NSIS) |
| `npm run dist:dir` | Gera build descompactado (sem instalador) |
| `npm run test:e2e` | Executa testes end-to-end |

---

## 📄 Licença

Este projeto está licenciado sob a licença **MIT** — veja o arquivo LICENSE para detalhes.
