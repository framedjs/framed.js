import Discord from "discord.js";
import { BaseEvent } from "packages/back-end/src/structures/BaseEvent";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import { logger } from "shared";
import util from "util";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			name: "message",
		});
	}

	async run(msg: Discord.Message): Promise<void> {
		if (msg.content.toLocaleLowerCase().includes("tim is inno")) {
			msg.reply("TIM IS GUILTY");
			logger.debug(`OnMsg: ${util.inspect(this)}`);
		}
	}
}
