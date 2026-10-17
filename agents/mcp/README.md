[English](README.md) | [简体中文](README.zh-CN.md)

# Use the verifier from an MCP client

Apify hosts an MCP server that exposes Actors as tools. Scoping it to this one
Actor keeps the agent's tool list short, which matters — an agent handed thirty
tools picks the wrong one.

```
https://mcp.apify.com?tools=sumitr_mardy/email-verifier
```

> **Check this against Apify's current MCP documentation before relying on it.**
> The server URL, the query parameter name and the client config format have all
> changed before and will change again. Everything in this directory is written
> from the format that was current when the repo was built; the files are a
> starting point, not a guarantee. If a config here does not work, the docs are
> right and this file is wrong — please open an issue.

## Claude Desktop

Edit `claude_desktop_config.json`:

- macOS — `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows — `%APPDATA%\Claude\claude_desktop_config.json`

See [`claude-desktop.json`](claude-desktop.json). Restart Claude Desktop after
saving; MCP servers are read at startup.

## Cursor

Project-level `.cursor/mcp.json`, or the global one in `~/.cursor/`.
See [`cursor.json`](cursor.json).

## Authentication

Two ways, and which is available depends on the client:

**OAuth** — point the client at the bare URL and let it handle sign-in. Nothing
secret is written to disk. Preferred where the client supports it.

**Bearer token** — send your Apify token in an `Authorization` header. Needed
for clients without OAuth support, and for a config that has to run
unattended. Get a token at
<https://console.apify.com/settings/integrations>.

Some clients cannot send custom headers to a remote MCP server, which is why
the config files also show the `mcp-remote` bridge: it runs locally over stdio
and adds the header for you.

**Never commit a token.** Both config files use `YOUR_APIFY_TOKEN` as a
placeholder — the repo's CI fails if a real one appears.

## Also possible

Apify's CLI can install an MCP config for a supported client:

```bash
apify mcp install <client>
```

Confirm that command still exists in the version you have — `apify --help` will
say.

## What the agent gets

One tool that verifies addresses and returns a record per address with a stable
shape: `status`, `sub_status`, `score` and eleven `checks` booleans, all always
present and never null.

Give the agent the action table from [`../../docs/statuses.md`](../../docs/statuses.md)
in its system prompt, or point it at [`../../llms.txt`](../../llms.txt), which is
the whole contract in one pass. An agent with verdicts but no policy will invent
one, and the mistake it makes most is reporting `unknown` as "invalid" — which
is how a real recipient gets deleted from a list.
