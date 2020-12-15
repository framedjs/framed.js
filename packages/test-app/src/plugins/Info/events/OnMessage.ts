import Discord from "discord.js";
import { BaseEvent, FramedMessage, BasePlugin } from "back-end";
import { logger } from "shared";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			name: "message",
		});
	}

	async run(msg: Discord.Message): Promise<void> {
		const content = msg.content.toLocaleLowerCase();
		if (content.includes("tim is inno")) {
			await msg.channel.send(`${msg.author}, TIM IS GUILTY`);
		} else if (content == `<@!${msg.client.user?.id}>`) {
			logger.warn(`OnMsg.ts: Content: ${content}`);
			// msg.content = `${this.framedClient.defaultPrefix}ping`;

			try {
				const newFramedMsg = new FramedMessage({
					framedClient: this.framedClient,
					content: `${this.framedClient.defaultPrefix}help`,
					discord: {
						base: msg,
					},
				});

				await this.plugin.pluginManager.runCommand(newFramedMsg);
			} catch (error) {
				logger.error(error.stack);
			}

			logger.warn("Finished");
		}
	}
}
