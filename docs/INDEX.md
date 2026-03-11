# PageAgent — Comprehensive Index

> An in-page GUI agent framework that lets LLMs perceive and operate any web page.  
> **Repository:** `groxaxo/page-agent` · **License:** MIT

---

## Table of Contents

1. [Package Overview](#1-package-overview)
2. [Quick Start](#2-quick-start)
3. [Core Package — `@page-agent/core`](#3-core-package--page-agentcore)
   - [PageAgentCore](#pageagentcore)
   - [AgentConfig](#agentconfig)
   - [Built-in Tools](#built-in-tools)
   - [Event System](#event-system)
   - [Types Reference](#types-reference)
4. [Main Entry — `page-agent`](#4-main-entry--page-agent)
   - [PageAgent](#pageagent)
   - [PageAgentConfig](#pageagentconfig)
5. [LLM Package — `@page-agent/llms`](#5-llm-package--page-agentllms)
   - [LLM](#llm)
   - [LLMConfig](#llmconfig)
   - [InvokeError / InvokeErrorType](#invokeerror--invokeerrortype)
6. [Page Controller — `@page-agent/page-controller`](#6-page-controller--page-agentpage-controller)
   - [PageController](#pagecontroller)
   - [PageControllerConfig](#pagecontrollerconfig)
   - [BrowserState](#browserstate)
   - [DOM Pipeline](#dom-pipeline)
7. [UI Package — `@page-agent/ui`](#7-ui-package--page-agentui)
   - [Panel](#panel)
   - [i18n / Locales](#i18n--locales)
8. [Browser Extension — `@page-agent/ext`](#8-browser-extension--page-agentext)
9. [Website / Documentation — `@page-agent/website`](#9-website--documentation--page-agentwebsite)
10. [Architecture](#10-architecture)
11. [Configuration Reference](#11-configuration-reference)
12. [Lifecycle Hooks](#12-lifecycle-hooks)
13. [Custom Tools](#13-custom-tools)
14. [Privacy & Telemetry](#14-privacy--telemetry)
15. [File Map](#15-file-map)

---

## 1. Package Overview

| Package | npm Name | Version | Description |
|---------|----------|---------|-------------|
| `packages/page-agent/` | `page-agent` | 1.5.x | **Main entry** — `PageAgent` class with built-in UI panel |
| `packages/core/` | `@page-agent/core` | 1.5.x | **Headless agent** — `PageAgentCore` without any UI |
| `packages/llms/` | `@page-agent/llms` | 1.5.x | LLM client with retry, reflection-before-action |
| `packages/page-controller/` | `@page-agent/page-controller` | 1.5.x | DOM operations and visual feedback (SimulatorMask) |
| `packages/ui/` | `@page-agent/ui` | 1.5.x | Panel component and i18n strings |
| `packages/extension/` | `@page-agent/ext` | 0.1.x | Chrome browser extension (WXT + React) 🚧 WIP |
| `packages/website/` | `@page-agent/website` | 1.5.x | Documentation site (private, not published) |

> Workspaces are listed in topological order in the root `package.json`.

---

## 2. Quick Start

```bash
npm install page-agent
```

```typescript
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'sk-...',
  model: 'gpt-4o',
})

await agent.run('Search for the latest AI news')
```

### CDN (demo / no-build)

```html
<script type="module">
  import { PageAgent } from 'https://unpkg.com/page-agent/dist/demo.js'
</script>
```

---

## 3. Core Package — `@page-agent/core`

**Source:** `packages/core/src/`

### PageAgentCore

`class PageAgentCore extends EventTarget`  
**File:** `packages/core/src/PageAgentCore.ts`

Headless agent class. Does not include any UI. Requires a `PageController` to be injected.

#### Constructor

```typescript
new PageAgentCore(config: PageAgentCoreConfig)
```

`PageAgentCoreConfig = AgentConfig & { pageController: PageController }`

#### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique agent instance ID |
| `config` | `PageAgentCoreConfig` | Resolved config (with defaults) |
| `tools` | `Map<string, PageAgentTool>` | Active tool set |
| `pageController` | `PageController` | Injected DOM controller |
| `task` | `string` | Current task string |
| `taskId` | `string` | Current task run ID |
| `history` | `HistoricalEvent[]` | Full event history |
| `disposed` | `boolean` | Whether agent has been disposed |
| `onAskUser` | `(q: string) => Promise<string>` | Optional user-input callback for `ask_user` tool |

#### Key Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `run` | `(task: string, options?) => Promise<ExecutionResult>` | Execute a task |
| `stop` | `() => void` | Stop the running task |
| `observe` | `(content: string) => void` | Add a persistent observation to history |
| `dispose` | `(reason?) => void` | Dispose the agent and clean up resources |

#### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `statuschange` | `{ status: AgentStatus }` | Agent status transitions |
| `historychange` | `{ history: HistoricalEvent[] }` | History array updated |
| `activity` | `AgentActivity` | Real-time transient activity (for UI) |
| `dispose` | `{ reason?: string }` | Agent is being disposed |

---

### AgentConfig

**File:** `packages/core/src/types.ts`

```typescript
interface AgentConfig extends LLMConfig {
  language?:          SupportedLanguage           // 'en-US' | 'zh-CN'
  maxSteps?:          number                      // default: 40
  customTools?:       Record<string, PageAgentTool | null>
  instructions?: {
    system?:                string
    getPageInstructions?:   (url: string) => string | undefined | null
  }
  transformPageContent?:  (content: string) => Promise<string> | string
  customSystemPrompt?:    string
  experimentalScriptExecutionTool?: boolean
  experimentalLlmsTxt?:   boolean
  // Lifecycle hooks (see section 12)
  onBeforeStep?:  (agent: PageAgentCore, stepCount: number) => Promise<void> | void
  onAfterStep?:   (agent: PageAgentCore, history: HistoricalEvent[]) => Promise<void> | void
  onBeforeTask?:  (agent: PageAgentCore) => Promise<void> | void
  onAfterTask?:   (agent: PageAgentCore, result: ExecutionResult) => Promise<void> | void
  onDispose?:     (agent: PageAgentCore, reason?: string) => void
}
```

---

### Built-in Tools

**File:** `packages/core/src/tools/index.ts`

| Tool Name | Input Schema | Description |
|-----------|-------------|-------------|
| `done` | `{ text: string, success?: boolean }` | Complete the task with a final message |
| `wait` | `{ seconds: number (1–10) }` | Wait for page to load or stabilize |
| `ask_user` | `{ question: string }` | Ask the human a question (requires `onAskUser`) |
| `click_element_by_index` | `{ index: number }` | Click an interactive element by its highlight index |
| `input_text` | `{ index: number, text: string }` | Type text into an element |
| `scroll_down` / `scroll_up` | `{ numPages?: number }` | Scroll the page vertically |
| `scroll_element_down` / `scroll_element_up` | `{ index: number, numPages?: number }` | Scroll a scrollable element |
| `go_back` | `{}` | Navigate browser back |
| `open_url` | `{ url: string }` | Navigate to a URL |
| `execute_script` | `{ script: string }` | Execute JavaScript (experimental) |

> Custom tools can override or supplement built-ins via `AgentConfig.customTools`.

---

### Event System

```typescript
// Listen to status changes
agent.addEventListener('statuschange', (e) => {
  console.log(e.detail.status) // 'idle' | 'running' | 'completed' | 'error'
})

// Listen to activity (transient — for UI feedback)
agent.addEventListener('activity', (e) => {
  const activity = e.detail as AgentActivity
  // { type: 'thinking' }
  // { type: 'executing', tool: string, input: unknown }
  // { type: 'executed', tool: string, input: unknown, output: string, duration: number }
  // { type: 'retrying', attempt: number, maxAttempts: number }
  // { type: 'error', message: string }
})

// Listen to history updates
agent.addEventListener('historychange', (e) => {
  console.log(e.detail.history) // HistoricalEvent[]
})
```

---

### Types Reference

**File:** `packages/core/src/types.ts`

| Type | Description |
|------|-------------|
| `SupportedLanguage` | `'en-US' \| 'zh-CN'` |
| `AgentConfig` | Main config interface (extends `LLMConfig`) |
| `AgentStatus` | `'idle' \| 'running' \| 'completed' \| 'error'` |
| `AgentActivity` | Union of real-time activity states |
| `AgentReflection` | LLM reflection state (evaluation, memory, next goal) |
| `MacroToolInput` | Reflection + action input structure |
| `MacroToolResult` | Reflection + action output structure |
| `AgentStepEvent` | One agent step with reflection and action |
| `ObservationEvent` | Persistent observation injected into history |
| `UserTakeoverEvent` | Records when user took manual control |
| `RetryEvent` | LLM retry attempt event |
| `AgentErrorEvent` | Fatal error event |
| `HistoricalEvent` | Union of all history event types |
| `ExecutionResult` | Final task result `{ success, data, history }` |
| `PageAgentTool<TParams>` | Tool definition with schema and execute function |

---

## 4. Main Entry — `page-agent`

**Source:** `packages/page-agent/src/`

### PageAgent

`class PageAgent extends PageAgentCore`  
**File:** `packages/page-agent/src/PageAgent.ts`

Extends `PageAgentCore` by automatically creating a `PageController` and a `Panel` (UI).

#### Constructor

```typescript
new PageAgent(config: PageAgentConfig)
```

#### Additional Properties

| Property | Type | Description |
|----------|------|-------------|
| `panel` | `Panel` | Built-in UI panel (can be shown/hidden) |

---

### PageAgentConfig

```typescript
type PageAgentConfig = AgentConfig & PageControllerConfig
```

Combines [`AgentConfig`](#agentconfig) and [`PageControllerConfig`](#pagecontrollerconfig).

---

## 5. LLM Package — `@page-agent/llms`

**Source:** `packages/llms/src/`

### LLM

`class LLM extends EventTarget`  
**File:** `packages/llms/src/index.ts`

LLM client with retry logic and reflection-before-action enforcement.

#### Constructor

```typescript
new LLM(config: LLMConfig)
```

#### LLMConfig

**File:** `packages/llms/src/types.ts`

```typescript
interface LLMConfig {
  baseURL:      string   // OpenAI-compatible API base URL
  apiKey:       string
  model:        string
  temperature?: number   // default: 0
  maxRetries?:  number   // default: 3
  customFetch?: typeof fetch
}
```

#### Methods

| Method | Description |
|--------|-------------|
| `invoke(messages, tools, options?)` | Invoke LLM with tool calling |
| `parseLLMConfig(config)` | Validate and fill defaults (exported standalone) |

---

### InvokeError / InvokeErrorType

**File:** `packages/llms/src/errors.ts`

```typescript
enum InvokeErrorType {
  NETWORK_ERROR    = 'NETWORK_ERROR',
  PARSE_ERROR      = 'PARSE_ERROR',
  MAX_RETRIES      = 'MAX_RETRIES',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
}

class InvokeError extends Error {
  type: InvokeErrorType
}
```

---

## 6. Page Controller — `@page-agent/page-controller`

**Source:** `packages/page-controller/src/`

### PageController

`class PageController extends EventTarget`  
**File:** `packages/page-controller/src/PageController.ts`

Manages DOM state, element interactions, and optional visual mask. Independent of LLM.

#### Constructor

```typescript
new PageController(config?: PageControllerConfig)
```

#### Key Methods

| Method | Description |
|--------|-------------|
| `updateTree()` | Re-extract DOM tree and update internal state |
| `getSimplifiedHTML()` | Get text representation of interactive elements |
| `getPageInfo()` | Get structured page metadata (URL, title, scroll, etc.) |
| `getBrowserState()` | Get full `BrowserState` ready for LLM consumption |
| `getLastUpdateTime()` | Timestamp of last DOM update |
| `clickElement(index)` | Click element by highlight index |
| `inputText(index, text)` | Type text into element |
| `selectOption(index, value)` | Select dropdown option |
| `scroll(options)` | Scroll page or element |
| `goBack()` | Navigate back |
| `openURL(url)` | Navigate to URL |

#### Events

| Event | Description |
|-------|-------------|
| `beforeUpdate` | Emitted before DOM tree extraction |
| `afterUpdate` | Emitted after DOM tree extraction |

---

### PageControllerConfig

**File:** `packages/page-controller/src/PageController.ts`

```typescript
interface PageControllerConfig extends DomConfig {
  enableMask?: boolean   // Show visual overlay during operations (default: false)
}
```

**`DomConfig`** (`packages/page-controller/src/dom/index.ts`):

```typescript
interface DomConfig {
  viewportExpansion?:    number         // -1 = full page, 0 = viewport only (default: -1)
  interactiveBlacklist?: (Element | (() => Element))[]
  interactiveWhitelist?: (Element | (() => Element))[]
  includeAttributes?:    string[]
  highlightOpacity?:     number
  highlightLabelOpacity?: number
}
```

---

### BrowserState

```typescript
interface BrowserState {
  url:     string  // Current page URL
  title:   string  // Page title
  header:  string  // Page info + scroll position hint
  content: string  // Simplified HTML (interactive elements for LLM)
  footer:  string  // Scroll boundary hint
}
```

---

### DOM Pipeline

```
Live DOM
  ↓  dom_tree/index.js  (extract)
FlatDomTree { rootId, map: Record<string, DomNode> }
  ↓  dom/index.ts:getFlatTree()
  ↓  dom/index.ts:flatTreeToString()
Simplified HTML string (LLM-readable)
  ↓  PageController.getSimplifiedHTML()
BrowserState.content  →  LLM prompt
```

**Key DOM files:**

| File | Description |
|------|-------------|
| `dom/dom_tree/index.js` | Core DOM extraction engine (traversal, visibility, interactivity) |
| `dom/dom_tree/type.ts` | `FlatDomTree`, `DomNode`, `TextDomNode`, `ElementDomNode`, `InteractiveElementDomNode` |
| `dom/index.ts` | `getFlatTree()`, `flatTreeToString()`, `getSelectorMap()`, `getElementTextMap()` |
| `dom/getPageInfo.ts` | Extracts scroll info, viewport size, page dimensions |
| `patches/antd.ts` | Ant Design Select fix (promotes hidden combobox input) |
| `patches/react.ts` | React synthetic event patching |
| `actions.ts` | `clickElement`, `inputTextElement`, `scrollVertically`, `scrollHorizontally`, `selectOptionElement` |
| `SimulatorMask.ts` | Visual overlay that blocks user interaction during automation |

---

## 7. UI Package — `@page-agent/ui`

**Source:** `packages/ui/src/`

### Panel

**File:** `packages/ui/src/Panel.ts`

Floating UI panel that connects to a `PageAgentCore`-compatible agent via `PanelAgentAdapter`.

```typescript
new Panel(agent: PanelAgentAdapter, options?: { language?: SupportedLanguage })
```

The panel renders inside an isolated Shadow DOM element and manages its own lifecycle.

---

### i18n / Locales

**File:** `packages/ui/src/i18n/locales.ts`

Supports `en-US` and `zh-CN`. Strings cover:
- Agent status (`ready`, `thinking`, `task`, `step`, ...)
- Tool activity labels (`clicking`, `typing`, `scrolling`, ...)
- Error messages (`not found`, `cannot be empty`, `failed`, ...)

---

## 8. Browser Extension — `@page-agent/ext`

**Source:** `packages/extension/src/`  
> 🚧 Work-in-progress.

Built with **WXT** + **React** + **Tailwind CSS**.

| Component | File | Description |
|-----------|------|-------------|
| `MultiPageAgent` | `src/agent/MultiPageAgent.ts` | Extension agent that bridges multiple browser tabs |
| `RemotePageController` | `src/agent/RemotePageController.ts` | Proxy controller — relays DOM calls from the side panel to the content script |
| `TabsController` | `src/agent/TabsController.ts` | Manages multi-tab operations |
| `tabTools` | `src/agent/tabTools.ts` | Extension-specific tools: `open_new_tab`, `switch_tab`, `close_tab` |
| `ConfigPanel` | `src/entrypoints/sidepanel/components/ConfigPanel.tsx` | User-facing settings (LLM config, language, advanced options) |
| Side Panel Entry | `src/entrypoints/sidepanel/` | React app rendered in Chrome Side Panel |

**Build / zip:**

```bash
npm run zip -w @page-agent/ext
```

---

## 9. Website / Documentation — `@page-agent/website`

**Source:** `packages/website/src/`

Built with **React + Vite + Tailwind CSS + i18next**.

### Docs Pages

| Route | Page File | Description |
|-------|-----------|-------------|
| `/docs` | `pages/docs/index.tsx` | Docs index / landing |
| `/docs/introduction/overview` | `introduction/overview/page.tsx` | What is PageAgent? |
| `/docs/introduction/quick-start` | `introduction/quick-start/page.tsx` | Installation and first run |
| `/docs/introduction/limitations` | `introduction/limitations/page.tsx` | Known limitations |
| `/docs/introduction/troubleshooting` | `introduction/troubleshooting/page.tsx` | Common issues and fixes |
| `/docs/features/models` | `features/models/page.tsx` | Supported LLM models |
| `/docs/features/custom-instructions` | `features/custom-instructions/page.tsx` | `instructions.system` and `getPageInstructions` |
| `/docs/features/custom-tools` | `features/custom-tools/page.tsx` | Adding custom tools |
| `/docs/features/data-masking` | `features/data-masking/page.tsx` | `transformPageContent` for sensitive data |
| `/docs/features/chrome-extension` | `features/chrome-extension/page.tsx` | Using the browser extension |
| `/docs/features/third-party-agent` | `features/third-party-agent/page.tsx` | Integrating with other agents |
| `/docs/advanced/page-agent` | `advanced/page-agent/page.tsx` | `page-agent` advanced usage |
| `/docs/advanced/page-agent-core` | `advanced/page-agent-core/page.tsx` | Headless `PageAgentCore` usage |
| `/docs/advanced/page-controller` | `advanced/page-controller/page.tsx` | Direct `PageController` usage |
| `/docs/advanced/custom-ui` | `advanced/custom-ui/page.tsx` | Building a custom UI |
| `/docs/advanced/security-permissions` | `advanced/security-permissions/page.tsx` | Security and CSP |

### Dev Commands

```bash
npm start           # Start website dev server
npm run build       # Build all packages
npm run build:libs  # Build library packages only
npm run lint        # ESLint (TypeScript strict)
```

---

## 10. Architecture

### Module Dependency Graph

```
page-agent  ──────────────────────────────────────────┐
  │                                                   │
  ├─ @page-agent/core  ──────────────────────────────┤
  │     │                                            │
  │     ├─ @page-agent/llms                          │
  │     └─ @page-agent/page-controller               │
  │                                                  │
  └─ @page-agent/ui  ────────────────────────────────┘
       └─ (depends on PanelAgentAdapter interface only)

@page-agent/ext  (extension)
  ├─ @page-agent/core
  └─ @page-agent/page-controller  (via RemotePageController)
```

### Re-act Agent Loop

```
run(task)
  │
  └─ loop (up to maxSteps)
        │
        ├── observe()       — gather DOM + page info → BrowserState
        ├── think()         — LLM call with reflection-before-action
        │     ├── reflect   — evaluate_previous_goal, memory, next_goal
        │     └── act       — select and call a tool
        ├── execute tool    — DOM operation via PageController
        └── emit events     — historychange, activity, statuschange
```

### Reflection-Before-Action Mental Model

Every LLM call enforces a `MacroToolInput` structure:

```typescript
{
  evaluation_previous_goal: string,  // How well did the last action go?
  memory:                   string,  // Key facts to remember
  next_goal:                string,  // Immediate next objective
  action:                   { [toolName]: toolInput }
}
```

This enforces chain-of-thought reasoning before every DOM action.

---

## 11. Configuration Reference

### Minimal Configuration

```typescript
{
  baseURL: 'https://api.openai.com/v1',
  apiKey:  'sk-...',
  model:   'gpt-4o',
}
```

### Full Configuration

```typescript
const agent = new PageAgent({
  // LLM settings (required)
  baseURL:     'https://api.openai.com/v1',
  apiKey:      'sk-...',
  model:       'gpt-4o',
  temperature: 0,
  maxRetries:  3,

  // Agent behavior
  language:  'en-US',       // UI language
  maxSteps:  40,            // max steps per task

  // DOM configuration
  enableMask:           true,   // show visual overlay
  viewportExpansion:    -1,     // -1 = full page DOM extraction
  interactiveBlacklist: [],     // elements to exclude
  interactiveWhitelist: [],     // elements to force-include

  // Instructions
  instructions: {
    system: 'You are a helpful assistant operating in a CRM app.',
    getPageInstructions: (url) => {
      if (url.includes('/checkout')) return 'Do not submit the form.'
    },
  },

  // Data masking
  transformPageContent: (html) =>
    html.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]'),

  // Experimental features
  experimentalLlmsTxt:             true,
  experimentalScriptExecutionTool: false,
})
```

---

## 12. Lifecycle Hooks

All hooks are part of `AgentConfig` and are `@experimental`:

| Hook | Called When | Arguments |
|------|-------------|-----------|
| `onBeforeTask` | Task execution starts | `(agent)` |
| `onBeforeStep` | Before each step | `(agent, stepCount)` |
| `onAfterStep` | After each step | `(agent, history)` |
| `onAfterTask` | Task completes (success or failure) | `(agent, result)` |
| `onDispose` | Agent is disposed | `(agent, reason?)` |

---

## 13. Custom Tools

Tools can be added, overridden, or removed via `AgentConfig.customTools`.

### Add a new tool

```typescript
import { tool } from 'page-agent'
import * as z from 'zod/v4'

const agent = new PageAgent({
  // ...
  customTools: {
    get_user_profile: tool({
      description: 'Fetch the current user profile from the app.',
      inputSchema: z.object({}),
      execute: async function () {
        const data = await fetchCurrentUser()
        return JSON.stringify(data)
      },
    }),
  },
})
```

### Override a built-in tool

```typescript
customTools: {
  ask_user: tool({
    description: 'Ask a question via a custom modal.',
    inputSchema: z.object({ question: z.string() }),
    execute: async function ({ question }) {
      const answer = await showModal(question)
      return `User answered: ${answer}`
    },
  }),
}
```

### Remove a built-in tool

```typescript
customTools: {
  ask_user: null, // disables the ask_user tool entirely
}
```

---

## 14. Privacy & Telemetry

PageAgent contains **no telemetry, analytics, or tracking code**.

- No data is collected from users or web pages.
- No network requests are made beyond those to the configured LLM API endpoint.
- API keys are never sent to PageAgent servers (there are none).
- All processing is performed locally in the browser.

See [`docs/terms-and-privacy.md`](terms-and-privacy.md) for the full privacy policy.

---

## 15. File Map

```
/
├── docs/
│   ├── INDEX.md                  ← this file
│   ├── CHANGELOG.md
│   ├── CODE_OF_CONDUCT.md
│   ├── README-zh.md              (Chinese README)
│   └── terms-and-privacy.md
├── packages/
│   ├── core/src/
│   │   ├── PageAgentCore.ts      ← headless agent class
│   │   ├── tools/index.ts        ← built-in tool definitions
│   │   ├── types.ts              ← all public types
│   │   ├── utils/
│   │   │   ├── index.ts
│   │   │   └── autoFixer.ts      ← LLM output auto-correction
│   │   └── prompts/
│   │       └── system_prompt.md  ← default system prompt template
│   ├── llms/src/
│   │   ├── index.ts              ← LLM class + parseLLMConfig
│   │   ├── types.ts              ← LLMConfig, Message, Tool, etc.
│   │   ├── OpenAIClient.ts       ← OpenAI-compatible HTTP client
│   │   ├── errors.ts             ← InvokeError, InvokeErrorType
│   │   └── constants.ts
│   ├── page-controller/src/
│   │   ├── PageController.ts     ← main controller class
│   │   ├── SimulatorMask.ts      ← visual overlay component
│   │   ├── actions.ts            ← DOM interaction primitives
│   │   ├── dom/
│   │   │   ├── index.ts          ← getFlatTree, flatTreeToString, getSelectorMap
│   │   │   ├── dom_tree/
│   │   │   │   ├── index.js      ← core DOM extraction engine
│   │   │   │   └── type.ts       ← FlatDomTree type definitions
│   │   │   └── getPageInfo.ts
│   │   └── patches/
│   │       ├── antd.ts           ← Ant Design Select fix
│   │       └── react.ts          ← React event patching
│   ├── page-agent/src/
│   │   ├── PageAgent.ts          ← PageAgent (core + ui + controller)
│   │   └── demo.ts               ← IIFE demo build entry
│   ├── ui/src/
│   │   ├── Panel.ts              ← floating UI panel
│   │   └── i18n/
│   │       └── locales.ts        ← en-US and zh-CN strings
│   ├── extension/src/
│   │   ├── agent/
│   │   │   ├── MultiPageAgent.ts
│   │   │   ├── RemotePageController.ts
│   │   │   ├── TabsController.ts
│   │   │   └── tabTools.ts
│   │   └── entrypoints/sidepanel/
│   │       ├── App.tsx
│   │       └── components/
│   │           └── ConfigPanel.tsx
│   └── website/src/
│       ├── pages/docs/           ← all documentation pages
│       ├── components/           ← shared UI components
│       └── i18n/                 ← website i18n (en + zh)
├── README.md
├── CONTRIBUTING.md
├── AGENTS.md                     ← developer instructions for AI coding agents
├── package.json                  ← monorepo root
└── tsconfig.json
```
