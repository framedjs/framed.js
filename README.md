# Framed.js

## Table of Contents

-   [About](#About)
-   [Installation](#Installation)

## About

Framed.js is a bot framework, built with TypeScript.

## Installation

To install: `npm install framed.js`

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
