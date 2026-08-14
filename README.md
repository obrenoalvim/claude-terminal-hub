# claude-terminal-hub

A desktop app that turns "which folder was that Claude Code session in again?" into one click. It lists every recent Claude Code session across every project on your machine, in one place, and keeps up to 4 real terminals visible at once, side by side — each one a full PowerShell process, not a fake console.

Click a session in the sidebar and it opens a new pane already `cd`'d into that project and running `claude --resume <session-id>`. No more opening File Explorer, finding the right folder, opening a terminal there, and typing `claude --resume` by hand.

🇧🇷 [Leia em português abaixo](#-português)

## Features

- **Cross-project session list** — scans `~/.claude/projects/*.jsonl` directly, no config needed. Searchable, sorted by most recent activity.
- **One click to resume** — opens a new pane in the right folder and runs `claude --resume` for you.
- **Up to 4 terminal panes at once**, all visible together in a grid that reflows as you open and close panes (1, 2, 3, or 4) — never hidden behind tabs. Real PTYs via `node-pty`, full interactivity: arrow keys, `vim`, Claude Code's own TUI, all work normally.
- **Open another terminal at an existing pane's path**, one click from that pane's header — for when you want a second shell next to a Claude session without hunting for the folder again.
- **Blank shell button** for when you just want a plain terminal, no Claude session attached.
- Native Electron window — no browser tab, no server to remember to start.

## Requirements

- Windows (uses PowerShell; built and tested here — a Linux/macOS shell would need `SHELL` to point somewhere sane, untested)
- [Node.js](https://nodejs.org/) 18+
- [Claude Code](https://claude.com/claude-code) installed and logged in, for the "resume session" buttons to do anything

## Install & run

```powershell
git clone https://github.com/obrenoalvim/claude-terminal-hub.git
cd claude-terminal-hub
npm install
npm run dev
```

`npm run dev` starts it in development mode with hot reload. `npm run build` produces a production bundle under `out/`; `npm start` previews that build.

## Windows installer

`npm run dist` builds the app and packages it into a Windows installer (NSIS `.exe`) under `dist/`. The installer lets you pick the install directory and adds Desktop/Start Menu shortcuts — no admin rights required (`oneClick: false`).

```powershell
npm install
npm run dist
```

The resulting `dist/Claude Terminal Hub Setup <version>.exe` is the file to hand out; everything else under `dist/` is intermediate build output.

## Releasing updates

The installed app checks GitHub Releases for a newer version on startup (`electron-updater`) and offers to restart and install it once downloaded — no manual reinstall needed after the first install.

To publish a release: bump `version` in `package.json`, then run `npm run release` with a [`GH_TOKEN`](https://github.com/settings/tokens) (repo scope) in the environment. That builds the installer and uploads it plus the update metadata (`latest.yml`) to a new GitHub Release for the current tag. `npm run dist` (no token needed) builds locally without publishing.

## Architecture

- **Main process** (`src/main`) — owns the real work: `sessions.js` scans `~/.claude/projects` for session metadata, `pty-manager.js` owns the `node-pty` processes (one per open pane), `index.js` wires both up to `ipcMain` handlers and creates the window.
- **Preload** (`src/preload`) — exposes a narrow `window.api` surface via `contextBridge` (list sessions, start/write/resize/kill a pty pane, subscribe to pty output). No Node or Electron internals leak into the renderer.
- **Renderer** (`src/renderer`) — a small React app: `Sidebar` (search + session list), `PaneGrid` (lays out however many panes are open), `TerminalPane` (an [xterm.js](https://xtermjs.org/) instance wired to one pty via the preload API).

Claude Code writes one `.jsonl` transcript per session, and each line already carries the working directory (`cwd`), an AI-generated title (`aiTitle`), and the last prompt you sent (`lastPrompt`). `sessions.js` reads only the first and last few KB of each file (not the whole transcript) to pull those out fast, sorts everything by modification time, and hands it to the renderer as JSON.

## Limitations

- Max 4 panes by design, to keep the layout readable.
- Closing a pane kills its shell. There's no session persistence across an app restart yet — it's a prototype.
- "Open another terminal here" only works for panes that were opened with a known path (a resumed session, or one opened from another pane) — a blank shell defaults to your home folder and has nothing to copy.

---

## 🇧🇷 Português

Um app desktop que resolve o "em que pasta era essa sessão do Claude Code mesmo?" com um clique. Ele lista todas as sessões recentes do Claude Code de todos os projetos da sua máquina, num lugar só, e mantém até 4 terminais de verdade visíveis ao mesmo tempo, lado a lado — cada um um processo PowerShell completo, não um console fake.

Clica numa sessão na barra lateral e ela abre um painel novo já com `cd` pra pasta certa, rodando `claude --resume <session-id>`. Sem abrir o Explorer, achar a pasta certa, abrir um terminal ali e digitar `claude --resume` na mão.

### Funcionalidades

- **Lista de sessões entre projetos** — lê `~/.claude/projects/*.jsonl` direto, sem precisar configurar nada. Com busca, ordenado por atividade mais recente.
- **Um clique pra retomar** — abre um painel novo na pasta certa e já roda `claude --resume` pra você.
- **Até 4 painéis de terminal ao mesmo tempo**, todos visíveis juntos num grid que se reorganiza conforme você abre e fecha painéis (1, 2, 3 ou 4) — nunca escondido atrás de abas. PTYs de verdade via `node-pty`, totalmente interativos: setas, `vim`, a própria TUI do Claude Code, tudo funciona normal.
- **Abrir outro terminal na pasta de um painel existente**, com um clique no cabeçalho daquele painel — pra quando você quer um segundo shell do lado de uma sessão do Claude sem caçar a pasta de novo.
- **Botão de terminal em branco** pra quando você só quer um terminal comum, sem sessão do Claude atrelada.
- Janela nativa do Electron — sem aba de navegador, sem servidor pra lembrar de subir.

### Pré-requisitos

- Windows (usa PowerShell; construído e testado aqui — um shell Linux/macOS precisaria de `SHELL` apontando pra algo válido, não testado)
- [Node.js](https://nodejs.org/) 18+
- [Claude Code](https://claude.com/claude-code) instalado e logado, pros botões de "retomar sessão" funcionarem

### Instalar e rodar

```powershell
git clone https://github.com/obrenoalvim/claude-terminal-hub.git
cd claude-terminal-hub
npm install
npm run dev
```

`npm run dev` sobe em modo desenvolvimento com hot reload. `npm run build` gera um build de produção em `out/`; `npm start` roda esse build.

### Instalador Windows

`npm run dist` builda o app e empacota num instalador Windows (NSIS `.exe`) dentro de `dist/`. O instalador deixa escolher a pasta de instalação e cria atalhos na Área de Trabalho/Menu Iniciar — sem precisar de admin (`oneClick: false`).

```powershell
npm install
npm run dist
```

O arquivo `dist/Claude Terminal Hub Setup <versão>.exe` é o que se distribui; o resto dentro de `dist/` é build intermediário.

### Publicando atualizações

O app instalado verifica os GitHub Releases atrás de uma versão nova ao abrir (`electron-updater`) e oferece reiniciar pra instalar assim que baixa — sem precisar reinstalar na mão depois da primeira vez.

Pra publicar uma release: sobe o `version` no `package.json`, depois roda `npm run release` com um [`GH_TOKEN`](https://github.com/settings/tokens) (escopo `repo`) no ambiente. Isso builda o instalador e sobe ele mais o metadado de atualização (`latest.yml`) numa GitHub Release nova pra tag atual. `npm run dist` (sem token) builda local sem publicar.

### Arquitetura

- **Processo principal** (`src/main`) — dono do trabalho de verdade: `sessions.js` varre `~/.claude/projects` atrás de metadados de sessão, `pty-manager.js` gerencia os processos `node-pty` (um por painel aberto), `index.js` liga os dois a handlers do `ipcMain` e cria a janela.
- **Preload** (`src/preload`) — expõe uma superfície estreita `window.api` via `contextBridge` (listar sessões, iniciar/escrever/redimensionar/matar um painel, assinar a saída do pty). Nada de Node ou internals do Electron vaza pro renderer.
- **Renderer** (`src/renderer`) — um app React pequeno: `Sidebar` (busca + lista de sessões), `PaneGrid` (organiza quantos painéis estiverem abertos), `TerminalPane` (uma instância do [xterm.js](https://xtermjs.org/) ligada a um pty via a API do preload).

O Claude Code grava uma transcrição `.jsonl` por sessão, e cada linha já carrega o diretório de trabalho (`cwd`), um título gerado por IA (`aiTitle`) e o último prompt que você mandou (`lastPrompt`). O `sessions.js` lê só os primeiros e últimos KB de cada arquivo (não a transcrição inteira) pra puxar isso rápido, ordena tudo por data de modificação, e entrega pro renderer como JSON.

### Limitações

- Máximo de 4 painéis por design, pra manter o layout legível.
- Fechar um painel mata o shell dele. Ainda não existe persistência de sessão entre reinícios do app — é um protótipo.
- "Abrir outro terminal aqui" só funciona em painéis abertos com um caminho conhecido (uma sessão retomada, ou um aberto a partir de outro painel) — um terminal em branco cai na pasta home e não tem o que copiar.
