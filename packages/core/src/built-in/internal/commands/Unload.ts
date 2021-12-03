import { BaseCommand } from "../../../structures/BaseCommand";
import { BaseMessage } from "../../../structures/BaseMessage";
import { BasePlugin } from "../../../structures/BasePlugin";
import { Logger } from "@framedjs/logger";
import InternalPlugin, {
	InternalParseEverythingOptions,
	InternalParsePluginCommandOptions,
} from "../Internal.plugin";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "unload",
			about: "Unload framed.js commands and events.",
			usage: "[everything]",
			botPermissions: {
				discord: {
					permissions: ["SEND_MESSAGES"],
				},
			},
			userPermissions: {
				botOwnersOnly: true,
				checkAutomatically: false,
			},
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		// Manually checks user permission to stay silent template
		const permsResult = this.checkUserPermissions(
			msg,
			this.userPermissions
		);
		if (!permsResult.success) {
			Logger.warn(
				`${this.id} called by user without permission (${msg.discord?.author.id})`
			);
			return false;
		}

		await msg.send(`Unloading...`);

		const internalPlugin = this.plugin as InternalPlugin;
		await internalPlugin.parse(msg, "unload");

		await msg.send("Done!");

		return true;
	}

	unload(
		options:
			| InternalParseEverythingOptions
			| InternalParsePluginCommandOptions
	): void {
		const internalPlugin = this.plugin as InternalPlugin;

		// Unloads all events and commands
		if (options.everything) {
			for (const [, plugin] of this.client.plugins.map) {
				plugin.unloadEvents();
				plugin.unloadCommands();
			}

			internalPlugin.reload.reload({
				command: internalPlugin.reload,
				everything: false,
				load: "reload",
			});
			internalPlugin.reload.reload({
				command: internalPlugin.unload,
				everything: false,
				load: "reload",
			});
		} else {
			options.command.plugin.unloadCommand(options.command.id);
		}
	}
}
