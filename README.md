<p align="center">
  <img src="src/renderer/src/assets/icon.png" width="120" alt="SprintFocus Logo" />
</p>

<h1 align="center">📚 SprintFocus</h1>

<p align="center">
  <strong>Ambiente pessoal de foco e produtividade com Pomodoro, Métricas de Evolução, Calendário e Todo Do</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33.2.0-47848F?style=for-the-badge&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

---

## 📖 Sobre o Projeto

**SprintFocus** é uma aplicação desktop de alta produtividade construída com Electron, React e TypeScript. Projetada para proporcionar uma experiência imersiva e livre de distrações, reúne um timer Pomodoro com ajuste tátil via réguas horizontais, métricas visuais em gráfico de elevação vetorial, calendário mensal integrado de sessões e uma lista de tarefas (*Todo Do*) com design moderno em **Liquid Glass translúcido**.

---

## ✨ Funcionalidades Principais

| Módulo | Descrição |
|---|---|
| 🍅 **Pomodoro Timer** | Temporizador com foco e pausas ajustáveis via **Horizontal Ruler Picker** (arraste na régua ou botões steppers -5m / +5m), círculos de progresso suaves, ciclo de sessões e notificações nativas. |
| 📊 **Métricas de Evolução** | Dashboard completo com **gráfico vetorial SVG de montanha**, cards estatísticos (tempo hoje, ontem, total da semana, mês, média diária) e insights de consistência. |
| 📅 **Calendário de Estudos** | Visualização mensal das sessões realizadas, heatmap diário com chamas indicativas de consistência e resumo detalhado dos minutos focados por data. |
| 📝 **Todo Do (Liquid Glass)** | Lista de tarefas elegante com efeito translúcido (*backdrop-filter blur*), permitindo criar, marcar como concluído, editar títulos dinamicamente e excluir afazeres com persistência local. |
| 🎨 **Temas Claro e Escuro** | Sistema de temas dinâmico com persistência automática de preferência, contraste otimizado e paleta harmoniosa. |
| 📱 **Design Responsivo** | Interface adaptável a diferentes resoluções e larguras de tela, reorganizando colunas e controles automaticamente. |

---

## 🛠️ Tech Stack

### Core & Desktop

| Tecnologia | Versão | Uso |
|---|---|---|
| [Electron](https://www.electronjs.org/) | 33.2.0 | Framework desktop multiplataforma |
| [electron-vite](https://electron-vite.org/) | 2.3.0 | Ferramenta de build integrada e veloz para Electron |
| [electron-builder](https://www.electron.build/) | 25.1.8 | Empacotamento, compilação de instalador `.exe` e distribuição |

### Frontend (Renderer)

| Tecnologia | Versão | Uso |
|---|---|---|
| [React](https://react.dev/) | 18.3.1 | Construção da interface declarativa |
| [TypeScript](https://www.typescriptlang.org/) | 5.6.3 | Tipagem estática e segurança de código |
| [React Router DOM](https://reactrouter.com/) | 6.28.0 | Navegação fluida em SPA |
| [Zustand](https://zustand-demo.pmnd.rs/) | 5.0.0 | Gerenciamento de estado global e de temas |
| [Lucide React](https://lucide.dev/) | 0.460.0 | Conjunto moderno de ícones vetoriais |
| CSS Modules | — | Estilos isolados com variáveis CSS para temas e efeito Liquid Glass |

### Backend & Persistência (Main Process)

| Tecnologia | Versão | Uso |
|---|---|---|
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 11.7.0 | Banco de dados SQLite local de alto desempenho (modo WAL) |

---

## 🏗️ Arquitetura do Sistema

O projeto adota uma arquitetura em camadas com separação estrita de responsabilidades:

```
┌─────────────────────────────────────────────────────────────────┐
│                        ELECTRON APP                             │
│                                                                 │
│  ┌──────────────────┐  IPC Bridge  ┌──────────────────────────┐ │
│  │   Main Process   │◄────────────►│    Renderer Process      │ │
│  │   (Node.js)      │  (invoke/    │    (Chromium / React)    │ │
│  │                  │   handle)    │                          │ │
│  │  ┌────────────┐  │              │  ┌────────────────────┐  │ │
│  │  │  Database  │  │              │  │  Zustand (Themes)  │  │ │
│  │  │  (SQLite)  │  │              │  │  React Router      │  │ │
│  │  └────────────┘  │              │  └────────────────────┘  │ │
│  │  ┌────────────┐  │              │  ┌────────────────────┐  │ │
│  │  │ Notif Svc  │  │              │  │   Views / Slider:  │  │ │
│  │  └────────────┘  │              │  │   - Pomodoro       │  │ │
│  │  ┌────────────┐  │              │  │   - Metrics (SVG)  │  │ │
│  │  │ Window Mgr │  │              │  │   - Calendar       │  │ │
│  │  └────────────┘  │              │  │   - Todo Do        │  │ │
│  │                  │              │  └────────────────────┘  │ │
│  └──────────────────┘              └──────────────────────────┘ │
│              ▲                                                  │
│              │                                                  │
│  ┌───────────┴────────┐                                         │
│  │  Preload Script    │                                         │
│  │  (Context Bridge)  │                                         │
│  │  Expõe API segura  │                                         │
│  │  via window.api    │                                         │
│  └────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Camadas e Organização

- **Main Process (`src/main/`):** Gerencia o ciclo de vida do aplicativo Electron, inicialização das migrações do banco SQLite, janelas nativas e handlers IPC seguros (`database.ipc.ts`, `settings.ipc.ts`, `notification.ipc.ts`).
- **Preload Script (`src/preload/`):** Isola o contexto do Node.js por meio de `contextBridge`, expondo estritamente as operações permitidas no objeto tipado `window.api`.
- **Renderer Process (`src/renderer/`):** Aplicação React moderna com transições suaves em slider, componentes modulares e suporte a fallback de navegador caso executado fora do Electron.

---

## 📁 Estrutura de Diretórios

```
SprintFocus/
├── build/                                 # Recursos de build (icon.ico, icon.png)
├── release/                               # Artefatos compilados (.exe e instalador NSIS)
│   ├── SprintFocus Setup 1.0.0.exe        # Instalador oficial para Windows
│   └── win-unpacked/                      # Versão standalone descompactada
├── scripts/                               # Scripts de automação e testes E2E
├── src/
│   ├── main/                              # 🔧 Processo Principal (Node.js)
│   │   ├── index.ts                       # Entrada do main: inicializa app e janela
│   │   ├── database/
│   │   │   ├── connection.ts              # Conexão SQLite (WAL mode)
│   │   │   ├── migrations.ts              # Criação e versionamento de tabelas
│   │   │   └── repositories/             # Camada de repositórios
│   │   │       ├── sessions.repo.ts       # Consultas e inserções de sessões
│   │   │       └── settings.repo.ts       # Preferências e configurações
│   │   └── ipc/                           # Comunicação IPC tipada
│   │       ├── index.ts                   # Registro central dos canais IPC
│   │       ├── database.ipc.ts            # Handlers de sessões
│   │       ├── settings.ipc.ts            # Handlers de configurações
│   │       └── notification.ipc.ts        # Disparo de notificações de foco/pausa
│   ├── preload/                           # 🔒 Camada de Segurança (Bridge)
│   │   ├── index.ts                       # contextBridge.exposeInMainWorld
│   │   └── index.d.ts                     # Interfaces TypeScript de window.api
│   └── renderer/                          # 🎨 Interface de Usuário (React)
│       ├── index.html                     # HTML base
│       └── src/
│           ├── main.tsx                   # Entrada do React
│           ├── App.tsx                    # Rotas e layout principal
│           ├── api/
│           │   └── browserFallback.ts     # Fallback simulado para desenvolvimento web
│           ├── assets/
│           │   ├── icon.png               # Logotipo
│           │   └── styles/
│           │       ├── globals.css        # Variáveis de cores, tokens e temas
│           │       └── animations.css     # Animações e transições
│           ├── components/
│           │   ├── common/
│           │   │   ├── HorizontalRulerPicker.tsx         # Régua interativa de minutos
│           │   │   └── HorizontalRulerPicker.module.css
│           │   └── layout/
│           │       ├── MainLayout.tsx     # Shell da janela
│           │       ├── MainLayout.module.css
│           │       ├── StudyFlowSlider.tsx # Barra de navegação minimalista
│           │       └── StudyFlowSlider.module.css
│           ├── hooks/
│           │   └── useTheme.ts            # Store Zustand de controle de temas
│           └── pages/
│               ├── Pomodoro.tsx           # Temporizador e ciclos
│               ├── Pomodoro.module.css
│               ├── Metrics.tsx            # Gráficos de elevação e estatísticas
│               ├── Metrics.module.css
│               ├── Calendar.tsx           # Calendário, Heatmap e Todo Do
│               └── Calendar.module.css
├── electron.vite.config.ts                # Configuração do Vite para Electron
├── tsconfig.json                          # Configuração base do TypeScript
├── tsconfig.node.json                     # Tipagem do Node.js (main/preload)
├── tsconfig.web.json                      # Tipagem do DOM/React (renderer)
└── package.json                           # Dependências e scripts do projeto
```

---

## 🚀 Como Executar

### Pré-requisitos

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Sistema Operacional:** Windows 10/11 (ou macOS/Linux para desenvolvimento da interface)

### 1. Instalar Dependências

```powershell
npm install
```

> O script `postinstall` configurará automaticamente o binário nativo do SQLite (`better-sqlite3`) para o ambiente do Electron.

### 2. Executar em Modo de Desenvolvimento

```powershell
npm run dev
```

A aplicação será iniciada com suporte a Hot Reloading no renderer e recarregamento automático no processo principal.

---

## 📦 Como Compilar para `.exe` (Versão Final de Download)

O projeto está totalmente configurado com o **electron-builder** para empacotar o aplicativo e gerar o instalador final executável do Windows com os binários nativos do SQLite:

### Gerar Instalador Oficial (.exe):

```powershell
npm run dist
```

Este comando:
1. Compila o código TypeScript e empacota o frontend e backend com o `electron-vite`.
2. Inclui os módulos nativos do banco de dados SQLite.
3. Cria o instalador completo em:
   ```
   release/SprintFocus Setup 1.0.0.exe
   ```

### Gerar Versão Descompactada (Standalone):

Para testar o executável rapidamente sem passar pelo instalador:

```powershell
npm run dist:dir
```

O executável portátil estará pronto em `release/win-unpacked/SprintFocus.exe`.

---

## 📜 Comandos Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento com hot-reload |
| `npm run build` | Compila o código de produção com TypeScript e Vite |
| `npm run preview` | Testa a compilação localmente antes de empacotar |
| `npm run dist` | **Gera o instalador `.exe` final na pasta `release/`** |
| `npm run dist:dir` | **Gera o executável descompactado na pasta `release/win-unpacked/`** |
| `npm run test:e2e` | Executa a suíte de testes ponta a ponta |

---

## 📄 Licença

Este projeto está licenciado sob os termos da licença **MIT**.
