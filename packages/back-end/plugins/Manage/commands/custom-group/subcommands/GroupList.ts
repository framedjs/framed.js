import FramedMessage from "../../../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../../../src/structures/BaseCommand";
import BaseSubcommand from "../../../../../src/structures/BaseSubcommand";
import { oneLine } from "common-tags";
import EmbedHelper from "../../../../../src/utils/discord/EmbedHelper";

export default class CustomGroupAdd extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "list",
			about: "Lists all the groups.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Checks for permission
		if (
			!this.baseCommand.hasPermission(msg, this.baseCommand.permissions)
		) {
			this.baseCommand.sendPermissionErrorMessage(msg);
			return false;
		}

		const groupRepo = this.framedClient.databaseManager.groupRepo;
		if (groupRepo) {
			let template = "";
			const groups = await groupRepo.find();
			groups.forEach(element => {
				template += `${element.emote ? element.emote : "❔"} **${
					element.name
				}** - \`${element.id}\`\n`;
			});

			if (msg.discord) {
				const helpCommand = this.framedClient.pluginManager.plugins
					.get("default.bot.info")
					?.commands.get("help");
				const helpPrefix = helpCommand?.defaultPrefix;

				const embed = EmbedHelper.getTemplate(
					msg.discord,
					this.framedClient.helpCommands,
					this.id
				)
					.setTitle("Group List")
					.setDescription(
						oneLine`
					Here are a list of groups found. Groups are designed to be
					used on commands to be organized, and shown in commands such as \`${
						helpPrefix
							? helpPrefix
							: this.framedClient.defaultPrefix
					}${helpCommand?.id ? helpCommand.id : "help"}\`.`
					)
					.addField(
						"Layout",
						oneLine`In the list, icons are shown first. If there is no icon,
						it will show the ❔ icon by default. The next element is simply
						the group's name. The last element is the ID, as stored in the database,
						or generated through script data.`
					)
					.addField(
						"Groups",
						template.length > 0
							? template
							: "There are no groups! Try `.group add` to create new groups."
					);
				await msg.discord?.channel.send(embed);
				return true;
			}
		} else {
			await msg.discord?.channel.send(
				`${msg.discord.author}, an error occured!`
			);
		}

		return false;
	}
}
