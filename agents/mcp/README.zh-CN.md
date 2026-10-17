[English](README.md) | [简体中文](README.zh-CN.md)

# 在 MCP 客户端中使用

Apify 提供托管的 MCP server，把 Actor 暴露成工具。把范围限定到这一个 Actor
能让 Agent 的工具列表保持简短 —— 这很重要，给 Agent 三十个工具，它会挑错。

```
https://mcp.apify.com?tools=sumitr_mardy/email-verifier
```

> **使用前请对照 Apify 当前的 MCP 文档核实。**
> server 地址、查询参数名、客户端配置格式都改过，以后还会改。本目录所有文件
> 都基于仓库构建时的格式编写，是起点，不是保证。如果这里的配置不work，
> 以官方文档为准，并欢迎来提 issue。

## Claude Desktop

编辑 `claude_desktop_config.json`：

- macOS —— `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows —— `%APPDATA%\Claude\claude_desktop_config.json`

见 [`claude-desktop.json`](claude-desktop.json)。保存后**重启 Claude Desktop**，
MCP server 只在启动时读取。

## Cursor

项目级 `.cursor/mcp.json`，或 `~/.cursor/` 下的全局配置。
见 [`cursor.json`](cursor.json)。

## 鉴权

两种方式，用哪种取决于客户端支持情况：

**OAuth** —— 客户端直接指向裸 URL，由它处理登录。磁盘上不留任何密钥。
客户端支持的话优先用这个。

**Bearer token** —— 在 `Authorization` 头里带上 Apify token。适用于不支持
OAuth 的客户端，以及需要无人值守运行的配置。token 在
<https://console.apify.com/settings/integrations> 创建。

有些客户端无法给远程 MCP server 发自定义 header，所以配置文件里还给了
`mcp-remote` 桥接方案：它在本地以 stdio 方式运行并替你加上 header。

**绝不要提交 token。** 两个配置文件都用 `YOUR_APIFY_TOKEN` 占位 ——
仓库的 CI 会在出现真实 token 时失败。

## 另一种方式

Apify CLI 可以为支持的客户端直接安装配置：

```bash
apify mcp install <client>
```

先用 `apify --help` 确认你装的版本里还有这个命令。

## Agent 拿到了什么

一个验证地址的工具，每个地址返回一条结构固定的记录：`status`、`sub_status`、
`score`，以及 11 个 `checks` 布尔字段，全部始终存在，永不为 null。

记得把 [`../../docs/statuses.zh-CN.md`](../../docs/statuses.zh-CN.md) 里的处置
对照表放进 system prompt，或者直接让它读
[`../../llms.txt`](../../llms.txt) —— 那是一页讲完整个契约。

只有结论、没有策略的 Agent 会自己编一套，而它最常犯的错是把 `unknown`
报成"无效" —— 真实收件人就是这样从名单里消失的。
