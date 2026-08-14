# claude-terminal-hub

A local web app that turns "which folder was that Claude Code session in again?" into one click. It lists every recent Claude Code session across every project on your machine, in one place, and opens up to 4 real terminals side by side — each one a full PowerShell session, not a fake console.

Click a session in the sidebar and it opens a new pane already `cd`'d into that project and running `claude --resume <session-id>`. No more opening File Explorer, finding the right folder, opening a terminal there, and typing `claude --resume` by hand.

🇧🇷 [Leia em português abaixo](#-português)

## Features

- **Cross-project session list** — scans `~/.claude/projects/*.jsonl` directly, no config needed. Sorted by most recent activity.
- **One click to resume** — opens a new pane in the right folder and runs `claude --resume` for you.
- **Up to 4 terminal panes at once**, real PTYs (via `node-pty` + Windows ConPTY), full interactivity: arrow keys, `vim`, Claude Code's own TUI, all work normally.
- **Blank shell button** for when you just want a plain terminal, no Claude session attached.
- Everything runs **locally** — it's an Express + WebSocket server bound to `localhost`, nothing leaves your machine.

## Requirements

- Windows (uses PowerShell and ConPTY; built and tested here — a Linux/macOS shell would need `SHELL` to point somewhere sane, untested)
- [Node.js](https://nodejs.org/) 18+
- [Claude Code](https://claude.com/claude-code) installed and logged in, for the "resume session" buttons to do anything

## Install & run

```powershell
git clone https://github.com/obrenoalvim/claude-terminal-hub.git
cd claude-terminal-hub
npm install
npm start
```

Then open **http://localhost:4173**.

## How it works

Claude Code writes one `.jsonl` transcript per session under `~/.claude/projects/<encoded-path>/`. Each line already carries the working directory (`cwd`), an AI-generated title (`aiTitle`), and the last prompt you sent (`lastPrompt`). The server reads just the first and last few KB of each file (not the whole transcript) to pull those fields out fast, sorts everything by modification time, and serves it as JSON to the sidebar.

Each pane is its own WebSocket connection to a real `node-pty` process on the server — the browser just relays keystrokes and screen output through [xterm.js](https://xtermjs.org/).

## Limitations

- No authentication — anything that can reach `localhost:4173` can spawn a shell on your machine. Don't expose the port beyond localhost.
- Max 4 panes by design, to keep the layout readable.
- Closing a pane kills its shell. There's no session persistence across a server restart yet — it's a prototype.

---

## 🇧🇷 Português

Um app web local que resolve o "em que pasta era essa sessão do Claude Code mesmo?" com um clique. Ele lista todas as sessões recentes do Claude Code de todos os projetos da sua máquina, num lugar só, e abre até 4 terminais de verdade lado a lado — cada um um PowerShell completo, não um console fake.

Clica numa sessão na barra lateral e ela abre um painel novo já com `cd` pra pasta certa, rodando `claude --resume <session-id>`. Sem abrir o Explorer, achar a pasta certa, abrir um terminal ali e digitar `claude --resume` na mão.

### Funcionalidades

- **Lista de sessões entre projetos** — lê `~/.claude/projects/*.jsonl` direto, sem precisar configurar nada. Ordenado por atividade mais recente.
- **Um clique pra retomar** — abre um painel novo na pasta certa e já roda `claude --resume` pra você.
- **Até 4 painéis de terminal ao mesmo tempo**, PTYs de verdade (via `node-pty` + ConPTY do Windows), totalmente interativos: setas, `vim`, a própria TUI do Claude Code, tudo funciona normal.
- **Botão de terminal em branco** pra quando você só quer um terminal comum, sem sessão do Claude atrelada.
- Tudo roda **localmente** — é um servidor Express + WebSocket preso em `localhost`, nada sai da sua máquina.

### Pré-requisitos

- Windows (usa PowerShell e ConPTY; construído e testado aqui — um shell Linux/macOS precisaria de `SHELL` apontando pra algo válido, não testado)
- [Node.js](https://nodejs.org/) 18+
- [Claude Code](https://claude.com/claude-code) instalado e logado, pros botões de "retomar sessão" funcionarem

### Instalar e rodar

```powershell
git clone https://github.com/obrenoalvim/claude-terminal-hub.git
cd claude-terminal-hub
npm install
npm start
```

Depois abre **http://localhost:4173**.

### Como funciona

O Claude Code grava uma transcrição `.jsonl` por sessão em `~/.claude/projects/<caminho-codificado>/`. Cada linha já carrega o diretório de trabalho (`cwd`), um título gerado por IA (`aiTitle`) e o último prompt que você mandou (`lastPrompt`). O servidor lê só os primeiros e últimos KB de cada arquivo (não a transcrição inteira) pra puxar esses campos rápido, ordena tudo por data de modificação, e serve como JSON pra barra lateral.

Cada painel é sua própria conexão WebSocket com um processo `node-pty` real no servidor — o navegador só repassa teclas e saída de tela via [xterm.js](https://xtermjs.org/).

### Limitações

- Sem autenticação — qualquer coisa que alcance `localhost:4173` consegue abrir um shell na sua máquina. Não exponha a porta além do localhost.
- Máximo de 4 painéis por design, pra manter o layout legível.
- Fechar um painel mata o shell dele. Ainda não existe persistência de sessão entre reinícios do servidor — é um protótipo.
