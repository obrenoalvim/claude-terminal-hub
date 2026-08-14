# claude-terminal-hub

A desktop app that turns "which folder was that Claude Code session in again?" into one click. It lists every recent Claude Code session across every project on your machine, in one place, and keeps up to 4 real terminals visible at once, side by side — each one a full PowerShell process, not a fake console.

Click a session in the sidebar and it opens a new pane already `cd`'d into that project and running `claude --resume <session-id>`. No more opening File Explorer, finding the right folder, opening a terminal there, and typing `claude --resume` by hand.

🇧🇷 [Leia em português abaixo](#-português)

## Features

- **Cross-project session list** — scans `~/.claude/projects/*.jsonl` directly, no config needed. Searchable, sorted by most recent activity. Clicking a session already open in a pane focuses it instead of opening a duplicate.
- **One click to resume** — opens a new pane in the right folder and runs `claude --resume` for you.
- **Up to 4 terminal panes at once**, all visible together in a grid that reflows as you open and close panes (1, 2, 3, or 4) — never hidden behind tabs. Real PTYs via `node-pty`, full interactivity: arrow keys, `vim`, Claude Code's own TUI, all work normally.
- **Panes survive an app restart** — what was open gets reopened (same folder/command) the next time you launch the app.
- **Open another terminal at an existing pane's path**, one click from that pane's header — for when you want a second shell next to a Claude session without hunting for the folder again.
- **Shell picker** for the blank-terminal button — PowerShell, cmd, Git Bash, or WSL, whichever's installed.
- **Keyboard shortcuts** — Ctrl+T new terminal, Ctrl+W close focused pane, Ctrl+Tab cycle focus, Ctrl+F search the focused pane, Ctrl+=/-/0 to zoom.
- **In-terminal search** (Ctrl+F) via xterm's search addon — jump between matches in a pane's scrollback.
- **Light/dark theme**, toggle in Settings.
- **Activity indicator** on each pane's status dot, and a confirmation prompt before closing a pane that had recent output — so you don't lose a running command to a stray click.
- **Desktop notification** when a pane exits or rings the terminal bell while the window isn't focused.
- **Auto-update**, checked on launch and every 4 hours while the app is open.
- Native Electron window — no browser tab, no server to remember to start.

## Requirements

- Windows (uses PowerShell; built and tested here — a Linux/macOS shell would need `SHELL` to point somewhere sane, untested)
- [Node.js](https://nodejs.org/) 18+
- [Claude Code](https://claude.com/claude-code) installed and logged in, for the "resume session" buttons to do anything
- Git Bash and/or WSL are optional — only needed if you pick them from the shell picker; the app falls back to PowerShell if they're not installed

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

To publish a release: bump `version` in `package.json`, then run `npm run release` with a [`GH_TOKEN`](https://github.com/settings/tokens) (repo scope) in the environment — `GH_TOKEN=$(gh auth token) npm run release` works if you're already logged into the `gh` CLI. That builds the installer and uploads it plus the update metadata (`latest.yml`) to a new GitHub Release for the current tag. `npm run dist` (no token needed) builds locally without publishing.

**Note:** `electron-builder` creates the GitHub Release as a **draft**. A draft release is invisible to `electron-updater`, so existing installs won't see the update until it's published: `gh release edit vX.Y.Z --draft=false`.

## Architecture

- **Main process** (`src/main`) — owns the real work: `sessions.js` scans `~/.claude/projects` for session metadata, `pty-manager.js` owns the `node-pty` processes (one per open pane, spawning whichever shell was picked, with a graceful fallback if it's not installed), `index.js` wires both up to `ipcMain` handlers, creates the window, and drives the periodic `electron-updater` check. `electron-log` is wired in here too — crashes and pty-spawn failures land in a log file instead of vanishing.
- **Preload** (`src/preload`) — exposes a narrow `window.api` surface via `contextBridge` (list sessions, start/write/resize/kill a pty pane, subscribe to pty output, forward a renderer error to the main-process log). No Node or Electron internals leak into the renderer.
- **Renderer** (`src/renderer`) — a small React app: `Sidebar` (search + session list + shell picker), `PaneGrid` (lays out however many panes are open), `TerminalPane` (an [xterm.js](https://xtermjs.org/) instance — plus its search addon — wired to one pty via the preload API), `SettingsPanel` (skip-permissions and theme toggles). Open panes, font size, theme, and sidebar state persist to `localStorage` and rehydrate on launch.

Claude Code writes one `.jsonl` transcript per session, and each line already carries the working directory (`cwd`), an AI-generated title (`aiTitle`), and the last prompt you sent (`lastPrompt`). `sessions.js` reads only the first and last few KB of each file (not the whole transcript) to pull those out fast, sorts everything by modification time, and hands it to the renderer as JSON.

## Limitations

- Max 4 panes by design, to keep the layout readable.
- Closing a pane kills its shell — panes with recent activity ask for confirmation first, idle ones close immediately.
- The activity indicator and close confirmation are approximate (based on recent pty output), not real shell-integration ("is a command actually still running") — that would need OSC133 prompt markers, which no shell here emits by default.
- "Open another terminal here" only works for panes that were opened with a known path (a resumed session, or one opened from another pane) — a blank shell defaults to your home folder and has nothing to copy.
- Keyboard shortcuts are fixed, not user-remappable.

---

## 🇧🇷 Português

Um app desktop que resolve o "em que pasta era essa sessão do Claude Code mesmo?" com um clique. Ele lista todas as sessões recentes do Claude Code de todos os projetos da sua máquina, num lugar só, e mantém até 4 terminais de verdade visíveis ao mesmo tempo, lado a lado — cada um um processo PowerShell completo, não um console fake.

Clica numa sessão na barra lateral e ela abre um painel novo já com `cd` pra pasta certa, rodando `claude --resume <session-id>`. Sem abrir o Explorer, achar a pasta certa, abrir um terminal ali e digitar `claude --resume` na mão.

### Funcionalidades

- **Lista de sessões entre projetos** — lê `~/.claude/projects/*.jsonl` direto, sem precisar configurar nada. Com busca, ordenado por atividade mais recente. Clicar numa sessão que já tá aberta num painel só foca ele, sem duplicar.
- **Um clique pra retomar** — abre um painel novo na pasta certa e já roda `claude --resume` pra você.
- **Até 4 painéis de terminal ao mesmo tempo**, todos visíveis juntos num grid que se reorganiza conforme você abre e fecha painéis (1, 2, 3 ou 4) — nunca escondido atrás de abas. PTYs de verdade via `node-pty`, totalmente interativos: setas, `vim`, a própria TUI do Claude Code, tudo funciona normal.
- **Painéis sobrevivem a um restart do app** — o que tava aberto reabre (mesma pasta/comando) na próxima vez que você abrir o app.
- **Abrir outro terminal na pasta de um painel existente**, com um clique no cabeçalho daquele painel — pra quando você quer um segundo shell do lado de uma sessão do Claude sem caçar a pasta de novo.
- **Escolha de shell** no botão de terminal em branco — PowerShell, cmd, Git Bash ou WSL, o que tiver instalado.
- **Atalhos de teclado** — Ctrl+T novo terminal, Ctrl+W fecha painel focado, Ctrl+Tab cicla foco, Ctrl+F busca no painel focado, Ctrl+/Ctrl-/Ctrl+0 zoom.
- **Busca dentro do terminal** (Ctrl+F) via addon de busca do xterm — navega entre ocorrências no scrollback do painel.
- **Tema claro/escuro**, toggle nas Configurações.
- **Indicador de atividade** no dot de status de cada painel, e confirmação antes de fechar um painel com atividade recente — pra não perder um comando rodando por um clique sem querer.
- **Notificação desktop** quando um painel encerra ou toca o bell do terminal com a janela sem foco.
- **Auto-update**, checado ao abrir e a cada 4h com o app aberto.
- Janela nativa do Electron — sem aba de navegador, sem servidor pra lembrar de subir.

### Pré-requisitos

- Windows (usa PowerShell; construído e testado aqui — um shell Linux/macOS precisaria de `SHELL` apontando pra algo válido, não testado)
- [Node.js](https://nodejs.org/) 18+
- [Claude Code](https://claude.com/claude-code) instalado e logado, pros botões de "retomar sessão" funcionarem
- Git Bash e/ou WSL são opcionais — só necessários se você escolher eles no seletor de shell; o app cai pra PowerShell se não tiverem instalados

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

Pra publicar uma release: sobe o `version` no `package.json`, depois roda `npm run release` com um [`GH_TOKEN`](https://github.com/settings/tokens) (escopo `repo`) no ambiente — `GH_TOKEN=$(gh auth token) npm run release` funciona se já tiver logado no `gh` CLI. Isso builda o instalador e sobe ele mais o metadado de atualização (`latest.yml`) numa GitHub Release nova pra tag atual. `npm run dist` (sem token) builda local sem publicar.

**Atenção:** o `electron-builder` cria a GitHub Release como **draft**. Uma release draft é invisível pro `electron-updater`, então quem já tem o app instalado não vê a atualização até ela ser publicada: `gh release edit vX.Y.Z --draft=false`.

### Arquitetura

- **Processo principal** (`src/main`) — dono do trabalho de verdade: `sessions.js` varre `~/.claude/projects` atrás de metadados de sessão, `pty-manager.js` gerencia os processos `node-pty` (um por painel aberto, com o shell escolhido, e fallback gracioso se ele não tiver instalado), `index.js` liga os dois a handlers do `ipcMain`, cria a janela e conduz o check periódico do `electron-updater`. O `electron-log` também tá ligado aqui — crash e falha de spawn do pty caem num arquivo de log em vez de sumir.
- **Preload** (`src/preload`) — expõe uma superfície estreita `window.api` via `contextBridge` (listar sessões, iniciar/escrever/redimensionar/matar um painel, assinar a saída do pty, repassar erro do renderer pro log do main). Nada de Node ou internals do Electron vaza pro renderer.
- **Renderer** (`src/renderer`) — um app React pequeno: `Sidebar` (busca + lista de sessões + escolha de shell), `PaneGrid` (organiza quantos painéis estiverem abertos), `TerminalPane` (uma instância do [xterm.js](https://xtermjs.org/) — mais o addon de busca — ligada a um pty via a API do preload), `SettingsPanel` (toggles de skip-permissions e tema). Painéis abertos, tamanho de fonte, tema e estado da sidebar persistem no `localStorage` e voltam ao abrir o app.

O Claude Code grava uma transcrição `.jsonl` por sessão, e cada linha já carrega o diretório de trabalho (`cwd`), um título gerado por IA (`aiTitle`) e o último prompt que você mandou (`lastPrompt`). O `sessions.js` lê só os primeiros e últimos KB de cada arquivo (não a transcrição inteira) pra puxar isso rápido, ordena tudo por data de modificação, e entrega pro renderer como JSON.

### Limitações

- Máximo de 4 painéis por design, pra manter o layout legível.
- Fechar um painel mata o shell dele — painéis com atividade recente pedem confirmação antes, os ociosos fecham direto.
- O indicador de atividade e a confirmação de fechamento são aproximados (baseados em output recente do pty), não shell-integration de verdade ("tem comando rodando de fato") — isso precisaria de marcadores OSC133 de prompt, que nenhum shell aqui emite por padrão.
- "Abrir outro terminal aqui" só funciona em painéis abertos com um caminho conhecido (uma sessão retomada, ou um aberto a partir de outro painel) — um terminal em branco cai na pasta home e não tem o que copiar.
- Atalhos de teclado são fixos, não remapeáveis pelo usuário.
