import { BaseEvent, BasePlugin, FramedMessage } from "back-end";
import Discord from "discord.js";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			name: "message",
		});
	}

	async run(msg: Discord.Message): Promise<void> {
		const legacyPollString = "poll:";
		const pollCommandPrefix = this.plugin.commands.get("poll")
			?.defaultPrefix;
		const newContent = msg.content
			.replace(legacyPollString, `${pollCommandPrefix}poll`)
			.trim();

		if (msg.content.startsWith(legacyPollString)) {
			this.framedClient.pluginManager.runCommand(
				new FramedMessage({
					framedClient: this.framedClient,
					content: newContent,
					discord: {
						base: msg
					},
				})
			);
		}
	}
}
