import { EmbedHelper, FramedMessage, BasePlugin, BaseCommand } from "back-end";
import { oneLine } from "common-tags";
import { logger } from "shared";
import { HelpData } from "back-end";

const data: HelpData[] = [
	{
		group: "Info",
		commands: [
			"info"
		]
	},
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
		group: "Markdown",
		commands: ["channel", "emoji", "user", "role", "raw"],
	},
	{
		group: "Utilities",
		commands: ["avatar", "link", "multi", "render"],
	},
	{
		group: "Dailies",
		commands: ["bumpstreak", "setmercies", "setstreak"],
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
		const helpFields = await this.framedClient.plugins.createHelpFields(
			data
		);

		if (msg.discord && helpFields) {
			let modRoleString = msg.discord.guild?.roles.cache
				.find(role => role.name == "Mods")
				?.toString();
			if (!modRoleString) {
				modRoleString = "<@&462342299171684364>";
			}

			let communitySupportRole = msg.discord.guild?.roles.cache
				.find(role => role.name == "Community Support")
				?.toString();
			if (!communitySupportRole) {
				communitySupportRole = "<@&758771336289583125>";
			}

			const embed = EmbedHelper.getTemplate(
				msg.discord,
				this.framedClient.helpCommands,
				this.id
			)
				.setTitle("Mod Command Help")
				.setDescription(
					oneLine`
						These are commands designed for ${modRoleString} and
						${communitySupportRole} use only.
						`
				)
				.addFields(helpFields);

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
