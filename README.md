# Framed.js

[![GitHub](https://img.shields.io/github/license/some1chan/framed.js)](https://github.com/some1chan/framed.js//blob/main/LICENSE.md)
[![npm](https://img.shields.io/npm/v/@framedjs/core?color=crimson&logo=npm&style=flat)](https://www.npmjs.com/package/@framedjs/core)

Framed.js is a multi-platform bot framework, made to be compatible between Discord and Twitch.

-   Object-oriented
-   Written in TypeScript
-   Built upon [discord.js](https://discord.js.org/#/) and (in the future) [Twurple](https://github.com/twurple/twurple)

⚠ **WARNING: This framework IS NOT STABLE, and does not have any documentation!** The only documentation is through code comments and other self-documentating things.

## Installation

Requirements may change, due to what [discord.js](https://discord.js.org/#/docs/discord.js/stable/general/welcome#Installation) requires.

```bash
# You can use npm instead of pnpm, but pnpm is *much* faster and I highly recommend it.
pnpm install @framedjs/core

# Install Framed.js dependencies
pnpm install discord.js twitch twitch-auth twitch-chat-client
```

## Usage

### Quick Start 

TypeScript is used in this example, and although untested (and with a few changes), this framework _should_ work with JavaScript. Create these files, and make sure your project starts at src/index.ts.

NOTE: All the code below is currently untested.

```ts
// src/index.ts
import { Client, Discord } from "@framedjs/core";

async function start() {
	const client = new Client({
		appVersion: "0.1.0",
		defaultPrefix: "!",
		discord: {
			botOwners: ["123456789012345678"], // Your user ID
		},
		footer: "",
	});

	client.plugins.loadPluginsIn({
		dirname: path.join(__dirname, "plugins"),
		filter: /^(.+plugin)\.(js|ts)$/,
		excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)$/,
	});

	await client.login([
		{
			type: "discord",
			token: "token",
			clientOptions: {
				intents: [
					Discord.Intents.FLAGS.DIRECT_MESSAGES,
					Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
					Discord.Intents.FLAGS.GUILDS,
					Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
					Discord.Intents.FLAGS.GUILD_MESSAGES,
					Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
				],
			},
		},
	]);
}

start();
```

Framed.js uses a plugin system, that allows you to import things like commands and events.

```ts
// src/plugins/Info/Info.plugin.ts
import { BasePlugin, Client } from "@framedjs/core";
import path from "path";

export default class extends BasePlugin {
	constructor(client: Client) {
		super(client, {
			id: "default.bot.info",
			name: "Info",
			description: "Info commands.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				// events: path.join(__dirname, "events"),
				// discordInteractions: path.join(__dirname, "interactions"),
				// discordMenuFlows: path.join(__dirname, "menus"),
			},
		});
	}
}
```

One command script can handle both Discord slash commands, and message commands.

```ts
// src/plugins/Info/commands/Ping.ts
import { BaseCommand, BaseMessage, BasePlugin } from "@framedjs/core";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "ping",
			about: "Sends a pong back!.",
			botPermissions: {
				discord: {
					permissions: ["SEND_MESSAGES"],
				},
			},
			discordInteraction: {
				slashCommandBuilder:
					new DiscordJsBuilders.SlashCommandBuilder(),
			},
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		await msg.send(`🏓 ${msg.discord.author} Pong!`);
		return true;
	}
}
```
