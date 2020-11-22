import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { BasePlugin } from "../../../src/structures/BasePlugin";
import { cmdList } from "../Info.plugin";
import { stripIndent } from "common-tags";
import EmbedHelper from "../../../src/utils/discord/EmbedHelper";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "botinfo",
			aliases: ["botstats"],
			about:
				"Gets various stats from the bot, including versions and uptime.",
			emojiIcon: "🤖",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		const framedUser = msg.framedClient.client.user;
		const environment = process.env.NODE_ENV
			? ` ${process.env.NODE_ENV}`
			: "";

		// For debugging
		// eslint-disable-next-line prefer-const
		let uptime = process.uptime();
		// uptime = 216120;

		if (msg.discord && framedUser) {
			const codeblock = "```";
			const embed = EmbedHelper.applyEmbedTemplate(
				msg.discord,
				this.id,
				cmdList
			).setDescription(stripIndent`
				${codeblock}
				Uptime:           ${this.secondsToDhms(uptime)}
				Framed Version:   v${msg.framedClient.version}
				Back-End Version: v${msg.framedClient.backEndVersion}${environment}
				${codeblock}
				`);
			msg.discord.channel.send(embed);
		}
		return true;
	}

	private secondsToDhms(seconds: number): string {
		seconds = Number(seconds);
		const d = Math.floor(seconds / (3600 * 24));
		const h = Math.floor((seconds % (3600 * 24)) / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);

		// const dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
		// const hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
		// const mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes ") : "";
		// const sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
		const dDisplay = d > 0 ? `${d}d ` : "";
		const hDisplay = h > 0 ? `${h}hr ` : "";
		const mDisplay = m > 0 ? `${m}m ` : "";
		const sDisplay = s > 0 ? `${s}s ` : "";

		// const dDisplay = d > 0 ? `${d}d ` : "";
		// const hDisplay = h > 0 ? `${h}:`: "";
		// const mDisplay = m > 0 ? `${m < 10 ? "0" : ""}${m}:` : "00:";
		// const sDisplay = s > 0 ? `${s < 10 ? "0" : ""}${s}` : "00";

		return `${dDisplay}${hDisplay}${mDisplay}${sDisplay}`;
		// return dDisplay + hDisplay + mDisplay + sDisplay;
	}
}
