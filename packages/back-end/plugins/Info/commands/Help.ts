import Discord from "discord.js";
import * as DiscordUtils from "../../../src/utils/DiscordUtils";
import FramedClient from "packages/back-end/src/structures/FramedClient";
import FramedMessage from "../../../src/structures/FramedMessage";
import { framedClient } from "../../../src/index";
import { logger } from "shared";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { cmdList } from "../shared/Shared";
import { oneLine, stripIndent } from "common-tags";

interface HelpCategory {
	category: string;
	command: HelpInfo[];
}

interface HelpInfo {
	emote: string;
	command: string;
}

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "help",
			defaultPrefix: ".",
			name: "Help",
			about: "View help for certain commands and extra info.",
			description: stripIndent`
				The help command can show a list of useful commands, or detail specific commands for you.
			`,
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
					this.id,
					cmdList
				);

				// embed.setDescription(stripIndent`
				// 	\`[]\` means it is optional.
				// 	\`<>\` means it isn't, and is a placeholder for some value.
				// 	\`[A | B]\` means you can choose either A or B.
				// `)

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
						let description = command.description;
						if (!description) {
							if (command.about) {
								description = command.about;
							} else {
								description = `*No description set for command.*`;
							}
						}
						embed.addField(
							`${command.plugin.name} Plugin`,
							`\`${command.defaultPrefix}${command.id}\`\n${description}`
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
					this.id,
					cmdList
				);
				embed = DiscordUtils.applyVersionInFooter(
					embed,
					framedUser.username,
					framedClient.version
				);
				embed
					.setDescription(
						oneLine`Pixel Pete is a custom bot system maintained by <@200340393596944384> 
						and <@359521958519504926>, specifically for Game Dev Underground. 
						Bot created partly with the [Framed](https://github.com/som1chan/Framed) bot framework.`
					)
					.addFields(this.createMainHelpFields(msg.framedClient))
					.addField("Other Bots", stripIndent`
						<@159985870458322944> \`!help\` - Bot generally used for \`!levels\` and \`!rank\`.
						<@234395307759108106> \`-help\` - Used for music in <#760622055384547368>.
					`);
				// .addField(
				// 	"Streaks",
				// 	`🕒 \`.streaks [@user | user ID | top | all]\` - View streak stats.`
				// );
				await discordMsg.channel.send(embed);
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
						if (command.id == cmdElement.command) {
							const usage = command.usage
								? ` ${command.usage}`
								: "";
							section += `${cmdElement.emote} \`${command.defaultPrefix}${command.id}${usage}\` - ${command.about}\n`;
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
