import Discord from "discord.js";
import { BaseEvent } from "../../../src/structures/BaseEvent";
import { BasePlugin } from "../../../src/structures/BasePlugin";
import FramedMessage from "../../../src/structures/FramedMessage";
import { logger } from "shared";
import util from "util";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			name: "message",
		});
	}

	async run(msg: Discord.Message): Promise<void> {
		const content = msg.content.toLocaleLowerCase();
		if (content.includes("tim is inno")) {
			await msg.reply("TIM IS GUILTY");
		} else if (content == `<@!${msg.client.user?.id}>`) {
			logger.warn(`OnMsg.ts: Content: ${content}`);
			// msg.content = `${this.framedClient.defaultPrefix}ping`;

			try {
				const newFramedMsg = new FramedMessage({
					framedClient: this.framedClient,
					discord: {
						client: msg.client,
						channel: msg.channel,
						content: `${this.framedClient.defaultPrefix}help`,
						author: msg.author,
						guild: msg.guild,
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
