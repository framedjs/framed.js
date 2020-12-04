import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { BasePlugin } from "../../../src/structures/BasePlugin";
import { oneLine, stripIndent } from "common-tags";
import EmbedHelper from "../../../src/utils/discord/EmbedHelper";
import os from "os";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "about",
			aliases: ["botinfo", "botstats"],
			about:
				"Gets extra info and stats from the bot, including versions and uptime.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		const framedUser = msg.framedClient.client.user;
		const nodeEnvironment = process.env.NODE_ENV
			? ` ${process.env.NODE_ENV}`
			: "";

		// For debugging
		// eslint-disable-next-line prefer-const
		let uptime = process.uptime();
		// uptime = 216120;

		if (msg.discord && framedUser) {
			const codeblock = "```";
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				this.framedClient.helpCommands,
				this.id
			).setTitle("About the Bot").setDescription(stripIndent`
				${oneLine`Pixel Pete is a collection of custom bots for
				<:gdu:766718483983368212> **Game Dev Underground**, by <@200340393596944384>,
				<@359521958519504926>, and <@150649616772235264>.`}
				${codeblock}yml
				Uptime:           ${this.secondsToDhms(uptime)}
				OS Environment:   ${os.platform()}
				Framed Version:   v${msg.framedClient.version}
				Back-End Version: v${msg.framedClient.backEndVersion}${nodeEnvironment}
				Dailies Version:  v1.52
				${codeblock}
				`);
			await msg.discord.channel.send(embed);
		}
		return true;
	}

	private secondsToDhms(seconds: number): string {
		seconds = Number(seconds);
		const d = Math.floor(seconds / (3600 * 24));
		const h = Math.floor((seconds % (3600 * 24)) / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);

		const dDisplay = d > 0 ? `${d}d ` : "";
		const hDisplay = h > 0 ? `${h}hr ` : "";
		const mDisplay = m > 0 ? `${m}m ` : "";
		const sDisplay = s > 0 ? `${s}s ` : "";

		return `${dDisplay}${hDisplay}${mDisplay}${sDisplay}`;
		// return dDisplay + hDisplay + mDisplay + sDisplay;
	}
}
