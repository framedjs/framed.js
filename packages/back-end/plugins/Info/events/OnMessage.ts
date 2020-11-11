import Discord from "discord.js";
import { BaseEvent } from "packages/back-end/src/structures/BaseEvent";
import FramedClient from "packages/back-end/src/structures/FramedClient";

export default class extends BaseEvent {
	constructor(client: FramedClient) {
		super(client, {
			name: "message"
		});
	}

	async run(msg: Discord.Message): Promise<void> {
		if (msg.content.toLocaleLowerCase().includes("tim is inno")) {
			msg.reply("TIM IS GUILTY");
		}
	}
}