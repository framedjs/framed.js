import { EmbedHelper, FramedMessage, BasePlugin, BaseCommand } from "back-end";
import { oneLine } from "common-tags";
import { logger } from "shared";
import { HelpData } from "back-end/src/managers/PluginManager";

const data: HelpData[] = [
	{
		group: "Manage",
		commands: [
			"command",
			// "addcom",
			// "editcom",
			// "delcom",
			"group",
			// "addgrp",
			// "editgrp",
			// "delgrp",
			// "setgrp",
		],
	},
	{
		group: "Utilities",
		commands: ["embed", "discohook", "escapemd"],
	},
	{
		group: "Dailies",
		commands: ["setstreak", "setmercies", "bumpstreak"],
	},
];

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "modhelp",
			aliases: ["modh", "mh"],
			about: "View help for mod commands.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		return this.showHelpAll(msg);
	}

	private async showHelpAll(msg: FramedMessage): Promise<boolean> {
		const helpFields = await this.framedClient.pluginManager.createHelpFields(
			data
		);

		if (msg.discord && helpFields) {
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				this.framedClient.helpCommands,
				this.id
			)
				.setTitle("Mod Command Help")
				.setDescription(
					oneLine`
						These are commands designed for <@&462342299171684364> and
						<@&758771336289583125> use only.
						`
				)
				.addFields(helpFields);

			// embed.setFooter(
			// 	`${
			// 		embed.footer?.text ? embed.footer.text : ""
			// 	}\nUse .help <command> to see more info.`,
			// 	embed.footer?.iconURL
			// );

			try {
				await msg.discord.channel.send(embed);
			} catch (error) {
				await msg.discord.channel.send(
					`${msg.discord.author}, the embed size for help is too large! Contact one of the bot masters`
				);
				logger.error(error.stack);
			}
			return true;
		}
		return false;
	}
}
