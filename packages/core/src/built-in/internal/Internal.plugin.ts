import { Client } from "../../structures/Client";
import { BaseCommand } from "../../structures/BaseCommand";
import { BaseMessage } from "../../structures/BaseMessage";
import { BasePlugin } from "../../structures/BasePlugin";
import HeapDump from "./commands/HeapDump";
import Reload from "./commands/Reload";
import Unload from "./commands/Unload";
import { FriendlyError } from "../../structures/errors/FriendlyError";
import { Logger } from "@framedjs/logger";

export type InternalLoad = "unload" | "reload";

export interface InternalParseEverythingOptions {
	everything: true;
	load: InternalLoad;
	command?: undefined;
}

export interface InternalParsePluginCommandOptions {
	everything: false;
	load: InternalLoad;
	command: BaseCommand;
}

export default class InternalPlugin extends BasePlugin {
	unload!: Unload;
	reload!: Reload;

	constructor(client: Client) {
		super(client, {
			id: "default.bot.internal",
			name: "Internal",
			description: "Info commands.",
			version: "0.1.0",
			paths: {},
		});
	}

	async setupEvents(): Promise<void> {
		const heapDump = new HeapDump(this);
		this.reload = new Reload(this);
		this.unload = new Unload(this);
		this.setupCommands([heapDump, this.reload, this.unload]);
	}

	setupCommands(commands: BaseCommand[]): void {
		for (const command of commands) {
			if (this.commands.has(command.id)) {
				this.unloadCommand(command.id);
			}
			this.loadCommand(command);
		}
	}

	async parse(msg: BaseMessage, load: InternalLoad): Promise<void> {
		if (!msg.args || !msg.args[0]) return;

		const arg = msg.args[0]?.toLocaleLowerCase();

		if (arg == "all" || !arg) {
			this.unload.unload({
				everything: true,
				load: load,
			});

			if (load == "reload") {
				await this.reload.reload({
					everything: true,
					load: load,
				});
			}

			return;
		}

		const dotArgs = msg.getArgsContent().split(".");
		const everythingElseArgs = dotArgs.slice(3, dotArgs.length);
		const pluginId = `${dotArgs[0]}.${dotArgs[1]}.${dotArgs[2]}`;
		const idType = everythingElseArgs.shift();
		const plugin = this.client.plugins.map.get(pluginId);
		if (!plugin) {
			throw new FriendlyError(`Plugin ${pluginId} wasn't found!`);
		}

		const commandId = everythingElseArgs.shift();
		if (!commandId) {
			throw new FriendlyError(
				`Command ID in your arguments wasn't found!`
			);
		}
		const command = plugin.commands.get(commandId);
		if (!command) {
			throw new FriendlyError(`Command ${commandId} wasn't found!`);
		}

		const options:
			| InternalParseEverythingOptions
			| InternalParsePluginCommandOptions = {
			everything: false,
			load: load,
			command: command,
		};

		switch (idType) {
			case "command":
				this.unload.unload(options);

				if (load == "reload") {
					this.reload.reload(options);
				}
				break;
			default:
				throw new FriendlyError(`Option ${idType} is not supported.`);
		}
	}
}
