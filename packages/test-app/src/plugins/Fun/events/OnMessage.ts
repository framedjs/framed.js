import { BaseEvent, BasePlugin, FramedMessage } from "back-end";
import Discord from "discord.js";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "pollMessage",
			discord: {
				name: "message",
			},
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
			this.framedClient.plugins.runCommand(
				new FramedMessage({
					framedClient: this.framedClient,
					content: newContent,
					discord: {
						base: msg,
					},
				})
			);
		} else if (msg.content.toLocaleLowerCase().includes("tim is inno")) {
			// await msg.channel.send(`${msg.author}, TIM IS GUILTY`);
		}
	}
}
