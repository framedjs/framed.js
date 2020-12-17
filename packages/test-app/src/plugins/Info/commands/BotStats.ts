import {
	BaseCommand,
	BasePlugin,
	DatabaseManager,
	EmbedHelper,
	FramedMessage,
	Plugin,
} from "back-end";
import { stripIndent } from "common-tags";
import { logger, Utils } from "shared";
import os from "os";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "botstats",
			aliases: ["bot", "uptime", "botinfo", "version", "versions"],
			about: "Get bot stats, including versions and uptime.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Attempts to find dailies version
		let version = "???";
		try {
			const connection = this.framedClient.databaseManager.connection;
			if (!connection) {
				throw new Error(DatabaseManager.errorNoConnection);
			}
			const pluginId = "com.geekoverdrivestudio.dailies";
			const pluginRepo = connection.getRepository(Plugin);
			const plugin = await pluginRepo.findOne({
				where: {
					id: pluginId,
				},
			});
			if (!plugin) {
				throw new Error(
					Utils.util.format(
						DatabaseManager.errorNotFound,
						"plugin",
						pluginId
					)
				);
			}

			version = plugin.data.version as string;
		} catch (error) {
			logger.error(error.stack);
		}

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
			).setTitle("Bot Stats").setDescription(stripIndent`
				${codeblock}yml
				Uptime:              ${this.secondsToDhms(uptime)}
				OS/Arch:             ${os.platform()}/${os.arch()}
				Framed Back-End:     ${
					msg.framedClient.version
						? `v${msg.framedClient.version}`
						: "???"
				}
				Framed Bot Version:  ${
					msg.framedClient.appVersion
						? `v${msg.framedClient.appVersion}`
						: "???"
				}${nodeEnvironment}
				Dailies Bot Version: v${version}
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
