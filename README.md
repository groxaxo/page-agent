# Page Agent

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.alicdn.com/imgextra/i4/O1CN01qKig1P1FnhpFKNdi6_!!6000000000532-2-tps-1280-256.png">
  <img alt="Page Agent Banner" src="https://img.alicdn.com/imgextra/i1/O1CN01NCMKXj1Gn4tkFTsxf_!!6000000000666-2-tps-1280-256.png">
</picture>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![Downloads](https://img.shields.io/npm/dt/page-agent.svg)](https://www.npmjs.com/package/page-agent) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/page-agent)](https://bundlephobia.com/package/page-agent) [![GitHub stars](https://img.shields.io/github/stars/alibaba/page-agent.svg)](https://github.com/alibaba/page-agent)

The GUI Agent Living in Your Webpage. Control web interfaces with natural language.

🌐 **English** | [中文](./docs/README-zh.md)

👉 <a href="https://alibaba.github.io/page-agent/" target="_blank"><b>🚀 Demo</b></a> | <a href="https://alibaba.github.io/page-agent/docs/introduction/overview" target="_blank"><b>📖 Documentation</b></a> | <a href="https://news.ycombinator.com/item?id=47264138" target="_blank">📢 Join HN Discussion</a>

<video id="demo-video" src="https://github.com/user-attachments/assets/a1f2eae2-13fb-4aae-98cf-a3fc1620a6c2" controls crossorigin muted></video>

---

## ✨ Features

- **🎯 Easy integration**
    - No need for `browser extension` / `python` / `headless browser`.
    - Just in-page javascript. Everything happens in your web page.
    - The best tool for your agent to control web pages.
- **📖 Text-based DOM manipulation**
    - No screenshots. No OCR or multi-modal LLMs needed.
    - No special permissions required.
- **🧠 Bring your own LLMs**
- **🎨 Pretty UI with human-in-the-loop**
- **🐙 Optional [chrome extension](https://alibaba.github.io/page-agent/docs/features/chrome-extension) for multi-page tasks.**
- **🧩 Local MCP server for Codex, OpenCode, Claude Code, and other MCP clients.**

## 💡 Use Cases

- **SaaS AI Copilot** — Ship an AI copilot in your product in lines of code. No backend rewrite needed.
- **Smart Form Filling** — Turn 20-click workflows into one sentence. Perfect for ERP, CRM, and admin systems.
- **Accessibility** — Make any web app accessible through natural language. Voice commands, screen readers, zero barrier.
- **Multi-page Agent** — Extend your agent's reach across browser tabs with the optional [chrome extension](https://alibaba.github.io/page-agent/docs/features/chrome-extension).

## 🚀 Quick Start

### One-line integration

Fastest way to try PageAgent with our free Demo LLM:

```html
<script src="{URL}" crossorigin="true"></script>
```

| Mirrors | URL                                                                                |
| ------- | ---------------------------------------------------------------------------------- |
| Global  | https://cdn.jsdelivr.net/npm/page-agent@1.5.5/dist/iife/page-agent.demo.js         |
| China   | https://registry.npmmirror.com/page-agent/1.5.5/files/dist/iife/page-agent.demo.js |

> **⚠️ For technical evaluation only.** This demo CDN uses our free [testing LLM API](https://alibaba.github.io/page-agent/docs/features/models#free-testing-api). By using it, you agree to its [terms](https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md).

### NPM Installation

```bash
npm install page-agent
```

```javascript
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
    model: 'qwen3.5-plus',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: 'YOUR_API_KEY',
    language: 'en-US',
})

await agent.execute('Click the login button')
```

For more programmatic usage, see [📖 Documentations](https://alibaba.github.io/page-agent/docs/introduction/overview).

## 🔌 Local MCP Server

Page Agent now ships with a local STDIO MCP server in `packages/mcp-server/`. It keeps DOM inspection and execution inside the browser extension runtime while exposing deterministic browser tools through MCP.

### What you need

1. Build the workspaces:

```bash
npm install
npm run build:libs
```

2. Load the extension from `packages/extension/.output/chrome-mv3/` (or run `npm run build:ext -w @page-agent/ext` first).
3. Start the MCP server:

```bash
node /absolute/path/to/page-agent/packages/mcp-server/dist/index.js
```

The extension bridge uses `http://127.0.0.1:37173` by default, so no extra configuration is required for local development.

### Available MCP tools

- `page_agent_list_sessions`
- `page_agent_open_url`
- `page_agent_switch_session`
- `page_agent_get_browser_state`
- `page_agent_update_tree`
- `page_agent_click_element`
- `page_agent_input_text`
- `page_agent_select_option`
- `page_agent_scroll`
- `page_agent_scroll_horizontally`
- `page_agent_execute_javascript` (disabled unless `PAGE_AGENT_ALLOW_SCRIPT_EXECUTION=true`)
- `page_agent_run_task` (requires LLM env vars or explicit `llm` arguments)

See `/packages/mcp-server/README.md` and `/examples/mcp/` for setup examples for Claude Code, Codex, and OpenCode.

## 🤝 Contributing

We welcome contributions from the community! Follow our instructions in [CONTRIBUTING.md](CONTRIBUTING.md) for environment setup and local development.

Please read [Code of Conduct](docs/CODE_OF_CONDUCT.md) before contributing.

## 👏 Acknowledgments

This project builds upon the excellent work of **[`browser-use`](https://github.com/browser-use/browser-use)**.

`PageAgent` is designed for **client-side web enhancement**, not server-side automation.

```
DOM processing components and prompt are derived from browser-use:

Browser Use
Copyright (c) 2024 Gregor Zunic
Licensed under the MIT License

Original browser-use project: <https://github.com/browser-use/browser-use>

We gratefully acknowledge the browser-use project and its contributors for their
excellent work on web automation and DOM interaction patterns that helped make
this project possible.

Third-party dependencies and their licenses can be found in the package.json
file and in the node_modules directory after installation.
```

## 📄 License

[MIT License](LICENSE)

---

**⭐ Star this repo if you find PageAgent helpful!**

<a href="https://www.star-history.com/?repos=alibaba%2Fpage-agent&type=date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=alibaba/page-agent&type=date&theme=dark&legend=top-left&v=2" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=alibaba/page-agent&type=date&legend=top-left&v=2" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=alibaba/page-agent&type=date&legend=top-left&v=2" />
 </picture>
</a>
