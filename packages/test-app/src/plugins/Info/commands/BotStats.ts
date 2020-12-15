import { FramedMessage } from "back-end";
import { BaseCommand } from "back-end";
import { BasePlugin } from "back-end";
import { stripIndent } from "common-tags";
import { EmbedHelper } from "back-end";
import os from "os";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "botstats",
			aliases: ["uptime", "botinfo"],
			about: "Get bot stats, including versions and uptime.",
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
				${codeblock}yml
				Uptime:           ${this.secondsToDhms(uptime)}
				OS/Arch:          ${os.platform()}/${os.arch()}
				Framed Version:   v${msg.framedClient.version}
				App Version:      v${msg.framedClient.appVersion}${nodeEnvironment}
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
