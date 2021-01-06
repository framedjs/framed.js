import { BaseEvent, FramedMessage, BasePlugin } from "back-end";
import { logger } from "shared";
import Discord from "discord.js";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "helpMessage",
			discord: {
				name: "message",
			},
		});
	}

	async run(msg: Discord.Message): Promise<void> {
		const content = msg.content.toLocaleLowerCase();
		if (content == `<@!${msg.client.user?.id}>`) {
			logger.silly(`OnMsg.ts: Content: ${content}`);
			// msg.content = `${this.framedClient.defaultPrefix}ping`;

			try {
				const newFramedMsg = new FramedMessage({
					framedClient: this.framedClient,
					content: `${this.framedClient.defaultPrefix}help`,
					discord: {
						base: msg,
					},
				});

				await this.plugin.plugins.runCommand(newFramedMsg);
			} catch (error) {
				logger.error(error.stack);
			}
		}
	}
}
