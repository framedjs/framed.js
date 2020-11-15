import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import * as DiscordUtils from "../../../src/utils/DiscordUtils";
import { framedClient } from "packages/back-end/src";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import { cmdList } from "../shared/Shared";
import { stripIndent } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "botstats",
			name: "Bot Stats",
			about: "Gets various stats from the bot, including Framed version and uptime.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		const framedUser = framedClient.client.user;
		const discordMsg = msg.discord?.msg;
		const environment = process.env.NODE_ENV ? ` ${process.env.NODE_ENV}` : "";

		if (discordMsg && framedUser) {
			const codeblock = "```";
			const embed = DiscordUtils.applyEmbedTemplate(
				discordMsg,
				this.id,
				cmdList
			).setDescription(stripIndent`
				[Framed](https://github.com/som1chan/Framed)
				${codeblock}
				Uptime:           ${this.secondsToDhms(process.uptime())}
				Framed Version:   v${msg.framedClient.version}
				Back-End Version: v${msg.framedClient.backEndVersion}${environment}
				${codeblock}
				`
			);
			discordMsg.channel.send(embed);
		}
		return true;
	}

	private secondsToDhms(seconds: number): string {
		seconds = Number(seconds);
		const d = Math.floor(seconds / (3600 * 24));
		const h = Math.floor((seconds % (3600 * 24)) / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);

		const dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
		const hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
		const mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes ") : "";
		const sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
		return dDisplay + hDisplay + mDisplay + sDisplay;
	}
}
