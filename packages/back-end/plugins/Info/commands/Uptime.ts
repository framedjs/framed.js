import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import * as DiscordUtils from "../../../src/utils/DiscordUtils";
import { framedClient } from "packages/back-end/src";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import { cmdList } from "../shared/Shared";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "uptime",
			defaultPrefix: ".",
			name: "Uptime",
			about: "Gets the uptime of the bot.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		const framedUser = framedClient.client.user;
		const discordMsg = msg.discord?.msg;

		if (discordMsg && framedUser) {
			const embed = DiscordUtils.applyEmbedTemplate(
				discordMsg,
				this.id,
				cmdList
			).setDescription(
				`${
					discordMsg.client.user?.username
				} has been online since ${this.secondsToDhms(process.uptime())}.`
			);
			discordMsg.channel.send(embed);
		}
		return true;
	}

	secondsToDhms(seconds: number) {
		seconds = Number(seconds);
		const d = Math.floor(seconds / (3600 * 24));
		const h = Math.floor((seconds % (3600 * 24)) / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);

		// TODO: how to handle edge case with x min, 0 sec
		const dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
		const hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
		const mDisplay = m > 0 ? m + (m == 1 ? " minute, and " : " minutes, and ") : "";
		const sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
		return dDisplay + hDisplay + mDisplay + sDisplay;
	}
}
