import FramedMessage from "../../../src/structures/FramedMessage";
import Discord from "discord.js";
import * as DiscordUtils from "../../../src/utils/DiscordUtils";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { framedClient } from "../../../src/index";
import FramedClient from "packages/back-end/src/structures/FramedClient";
import { logger } from "shared";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";

interface HelpCategory {
	category: string;
	command: HelpInfo[];
}

interface HelpInfo {
	emote: string;
	command: string;
}

const cmdList = ["help", "ping"];

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "help",
			defaultPrefix: ".",
			name: "Help",
			about: "View help for certain commands and extra info.",
			usage: "[command]",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		const discordMsg = msg.discord?.msg;
		const framedUser = framedClient.client.user;

		if (msg.args && discordMsg && framedUser) {
			const lookUpCmd = msg.args[0];

			// Checks for a parameter
			if (lookUpCmd) {
				const embed = DiscordUtils.applyEmbedTemplate(
					discordMsg,
					this.info.id,
					cmdList
				);

				if (this.plugin) {
					const matchingCommands: BaseCommand[] = [];

					const plugins = msg.framedClient.pluginManager.plugins;
					const pluginList = Array.from(plugins.values());
					pluginList.forEach(plugin => {
						const command = plugin.commands.get(lookUpCmd);
						if (command) {
							matchingCommands.push(command);
						}
					});

					matchingCommands.forEach(command => {
						embed.addField(
							`Command Help`,
							`\`${command.info.defaultPrefix}${command.info.id}\`\n${command.info.about}`
						);
					});

					if (matchingCommands.length > 0) {
						discordMsg.channel.send(embed);
					}
					// else {
					// 	discordMsg.channel.send(
					// 		`${discordMsg.author}, Couldn't find the command "${lookUpCmd}"!`
					// 	);
					// }
				}
			} else {
				let embed = DiscordUtils.applyEmbedTemplate(
					discordMsg,
					this.info.id,
					cmdList
				);
				embed = DiscordUtils.applyVersionInFooter(
					embed,
					framedUser.username,
					framedClient.version
				);
				embed
					.setDescription(
						"Pixel Pete is a custom bot system maintained by <@200340393596944384> and <@359521958519504926>, " +
							"specifically for Game Dev Underground. " +
							"Bot created partly with the [Framed](https://github.com/som1chan/Framed) bot framework."
					)
					// .addField(
					// 	"Usage Syntax",
					// 	"`[]` means it is optional.\n" +
					// 	"`<>` means it isn't, and is a placeholder for some value.\n" +
					// 	"`[A | B]` means you can choose either A or B."
					// )
					.addFields(this.createMainHelpFields(msg.framedClient));
				// .addField(
				// 	"Streaks",
				// 	`🕒 \`.streaks [@user | user ID | top | all]\` - View streak stats.`
				// );
				discordMsg.channel.send(embed);
			}

			return true;
		}

		return true;
	}

	createMainHelpFields(framedClient: FramedClient): Discord.EmbedFieldData[] {
		const fields: Discord.EmbedFieldData[] = [];

		const helpList: HelpCategory[] = [
			{
				category: "Info",
				command: [
					{
						emote: "❓",
						command: "help",
					},
					{
						emote: "🏓",
						command: "ping",
					},
					{
						emote: "⌚",
						command: "uptime",
					},
				],
			},
			{
				category: "Fun",
				command: [
					{
						emote: "👍",
						command: "poll",
					},
				],
			},
		];

		const plugins = framedClient.pluginManager.plugins;

		// Loops through all of the help elements
		helpList.forEach(helpElement => {
			let section = "";

			plugins.forEach(plugin => {
				logger.debug("plugin");
				plugin.commands.forEach(command => {
					logger.debug("command");
					helpElement.command.forEach(cmdElement => {
						if (command.info.id == cmdElement.command) {
							const usage = command.info.usage
								? ` ${command.info.usage}`
								: "";
							section += `${cmdElement.emote} \`${command.info.defaultPrefix}${command.info.id}${usage}\` - ${command.info.about}\n`;
						}
					});
				});
			});

			fields.push({
				name: helpElement.category,
				value: section,
			});
		});

		return fields;
	}
}
