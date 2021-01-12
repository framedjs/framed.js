# Framed

## Table of Contents

-   [About](#About)
-   [Installation](#Installation)

## About

Framed is a [discord.js](https://discord.js.org/#/) framework, built with TypeScript.

The name comes from "pain" but with a "b" for bot. It also is a homophone for "bane".

## Installation

To install: `npm install framed`

## Example

```ts
import { Client } from "framed.js";

const client = new Client({
	defaultConnection: {
		type: "sqlite",
		database: "./data/FramedDB.sqlite",
		synchronize: true,
		entities: [DatabaseManager.defaultEntitiesPath],
	},
	defaultPrefix: "!",
	appVersion: "0.1.0",
});

client.plugins.loadPluginsIn({
	dirname: path.join(__dirname, "plugins"),
	filter: /^(.+plugin)\.(js|ts)$/,
	excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)$/,
});

client.login([
	{
		type: "discord",
		discord: {
			token: "token",
		},
	},
]);
```
