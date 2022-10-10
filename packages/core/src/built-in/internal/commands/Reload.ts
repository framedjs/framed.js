import { BaseCommand } from "../../../structures/BaseCommand";
import { BaseMessage } from "../../../structures/BaseMessage";
import { BasePlugin } from "../../../structures/BasePlugin";
import { Logger } from "@framedjs/logger";
import InternalPlugin, {
	InternalParseEverythingOptions,
	InternalParsePluginCommandOptions,
} from "../Internal.plugin";
import { FriendlyError } from "../../../structures/errors/FriendlyError";
import Discord from "discord.js";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "reload",
			about: "Reload framed.js commands and events.",
			usage: "[all]",
			botPermissions: {
				discord: {
					permissions: [Discord.PermissionFlagsBits.SendMessages],
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

		await msg.send(`Reloading...`);

		const internalPlugin = this.plugin as InternalPlugin;
		await internalPlugin.parse(msg, "unload");

		await msg.send("Done!");

		return true;
	}

	async reload(
		options:
			| InternalParseEverythingOptions
			| InternalParsePluginCommandOptions
	): Promise<void> {
		if (options.everything) {
			// Because reloadEverything is true, all events were wiped.
			// This requires us to re-init the old Discord events in client
			if (this.client.discord.client) {
				this.client.setupDiscordEvents(this.client.discord.client);
			}

			// If there is load options, clear and reload
			// plugins back in
			const plugins = this.client.plugins;
			if (plugins.pluginLoadOptions) {
				plugins.map.clear();
				plugins.loadPluginsIn(plugins.pluginLoadOptions);

				// Re-adds internal plugin
				plugins.map.set(this.plugin.id, this.plugin);
			}

			// Sets up plugin events again
			await this.client.setupPluginEvents();
		} else {
			// if (options.command instanceof BasePlugin) {
			// 	// Reloads the commands back in from all plugins
			// 	for (const [, plugin] of this.client.plugins.map) {
			// 		if (plugin.commandLoadOptions) {
			// 			plugin.loadCommandsIn(plugin.commandLoadOptions);
			// 		}
			// 	}
			// }

			// options.command.plugin.loadCommand(options.command);
			throw new FriendlyError(
				"Reloading commands back in isn't supported."
			);
		}
	}
}
