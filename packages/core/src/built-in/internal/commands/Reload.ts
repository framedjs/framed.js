import { BaseCommand } from "../../../structures/BaseCommand";
import { BaseMessage } from "../../../structures/BaseMessage";
import { BasePlugin } from "../../../structures/BasePlugin";
import { Logger } from "@framedjs/logger";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "reload",
			about: "Reload framed.js commands and events.",
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

		await msg.send(`Reloading...`);

		const reloadEverything = msg.args
			? msg.args[0]?.toLocaleLowerCase() == "everything"
			: false;

		// Unloads all events and commands
		for (const [, plugin] of this.client.plugins.map) {
			if (reloadEverything) {
				plugin.unloadEvents();
			}
			plugin.unloadCommands();
		}

		if (reloadEverything) {
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
			// Reloads the commands back in from all plugins
			for (const [, plugin] of this.client.plugins.map) {
				if (plugin.commandLoadOptions) {
					plugin.loadCommandsIn(plugin.commandLoadOptions);
				}
			}
		}

		await msg.send("Done!");

		return true;
	}
}
