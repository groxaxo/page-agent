# Page Agent MCP Server

`@page-agent/mcp-server` exposes Page Agent’s browser capabilities as a local MCP server.

## Architecture

- **MCP transport:** STDIO, for maximum compatibility with local MCP clients.
- **Bridge transport:** a small local HTTP bridge between Node and the browser extension runtime.
- **DOM execution:** always stays in the extension/content-script runtime, not in Node.

## Start the server

From the repo root:

```bash
npm install
npm run build:libs
node /absolute/path/to/page-agent/packages/mcp-server/dist/index.js
```

The extension background worker automatically polls `http://127.0.0.1:37173`.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PAGE_AGENT_BRIDGE_HOST` | `127.0.0.1` | Local bridge bind host |
| `PAGE_AGENT_BRIDGE_PORT` | `37173` | Local bridge bind port |
| `PAGE_AGENT_BRIDGE_TOKEN` | unset | Optional shared secret for bridge polling |
| `PAGE_AGENT_BRIDGE_TIMEOUT_MS` | `20000` | Timeout for browser bridge commands |
| `PAGE_AGENT_DEFAULT_MAX_STEPS` | `20` | Default max steps for `page_agent_run_task` |
| `PAGE_AGENT_ALLOW_SCRIPT_EXECUTION` | `false` | Enables `page_agent_execute_javascript` and script execution in `page_agent_run_task` |
| `PAGE_AGENT_LLM_BASE_URL` | unset | Default LLM base URL for `page_agent_run_task` |
| `PAGE_AGENT_LLM_API_KEY` | unset | Default LLM API key for `page_agent_run_task` |
| `PAGE_AGENT_LLM_MODEL` | unset | Default LLM model for `page_agent_run_task` |
| `PAGE_AGENT_LLM_TEMPERATURE` | unset | Default LLM temperature for `page_agent_run_task` |
| `PAGE_AGENT_LLM_MAX_RETRIES` | unset | Default LLM retry count for `page_agent_run_task` |

## Extension bridge configuration

The extension uses these Chrome storage keys if you want to override the defaults:

- `pageAgentMcpBridgeUrl`
- `pageAgentMcpBridgeToken`

Example from the extension service-worker console:

```js
chrome.storage.local.set({
  pageAgentMcpBridgeUrl: 'http://127.0.0.1:37173',
  pageAgentMcpBridgeToken: 'replace-me-if-you-enable-token-auth',
})
```

## MCP tools

Deterministic tools first:

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
- `page_agent_execute_javascript`

High-level wrapper:

- `page_agent_run_task`

`page_agent_run_task` is a thin wrapper around `PageAgentCore`. It still uses the browser bridge for page actions, so DOM execution remains in the browser runtime.
