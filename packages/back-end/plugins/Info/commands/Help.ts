import Discord from "discord.js";
// import * as Pagination from "discord-paginationembed";
import EmbedHelper from "../../../src/utils/discord/EmbedHelper";
import FramedMessage from "../../../src/structures/FramedMessage";
import { BasePlugin } from "../../../src/structures/BasePlugin";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { oneLine, stripIndent } from "common-tags";
import { logger } from "shared";
import { DatabaseManager } from "packages/back-end/src/managers/DatabaseManager";
import Command from "packages/back-end/src/managers/database/entities/Command";

interface HelpCategory {
	category: string;
	command: HelpInfo[];
}

interface HelpInfo {
	command: string;
}

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "help",
			aliases: ["h", "commands"],
			about: "View help for certain commands and extra info.",
			description: stripIndent`
				Shows a list of useful commands, or detail specific commands for you.
			`,
			usage: "[command]",
			examples: stripIndent`
				\`{{prefix}}help\`
				\`{{prefix}}help poll\`
			`,
			inlineCharacterLimit: 40,
			emojiIcon: "❓",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		const framedUser = this.framedClient.client.user;
		if (msg.discord && msg.args && framedUser) {
			const lookUpCmd = msg.args[0];

			// Checks for a parameter
			if (lookUpCmd) {
				const matchingCommands: BaseCommand[] = [];

				const plugins = this.framedClient.pluginManager.plugins;
				plugins.forEach(plugin => {
					const command = plugin.commands.get(lookUpCmd);
					if (command) {
						matchingCommands.push(command);
					} else {
						const alias = plugin.aliases.get(lookUpCmd);
						if (alias) {
							matchingCommands.push(alias);
						}
					}
				});

				for await (const command of matchingCommands) {
					// Get the description
					let description = command.description;
					if (!description) {
						if (command.about) {
							description = command.about;
						} else {
							description = `*No description set for command.*`;
						}
					}

					// Creates the embed
					const embed = EmbedHelper.getEmbedTemplate(
						msg.discord,
						this.framedClient,
						this.id
					)
						.setTitle(`${command.defaultPrefix}${command.id}`)
						.setDescription(description);
					// .addField(
					// 	`${command.plugin.name} Plugin`,
					// 	`\`${command.prefix}${command.id}\`\n${description}`
					// );

					// Sets the inline character limit, for when it should become not inline
					// if it exceeds this value
					let inlineCharacterLimit = 25;
					if (command.inlineCharacterLimit) {
						inlineCharacterLimit = command.inlineCharacterLimit;
					}
					logger.debug(
						"Help.ts: Inline Character Limit: " +
							inlineCharacterLimit
					);

					if (command.usage) {
						const guideMsg = stripIndent`
							Type \`.usage\` for important info.
						`;
						const usageMsg = stripIndent`
							\`${command.defaultPrefix}${command.id} ${command.usage}\`
						`;
						embed.addField(
							"Usage",
							`${guideMsg}\n${usageMsg}`,
							usageMsg.length <= inlineCharacterLimit
						);
					}

					if (command.examples) {
						embed.addField(
							"Examples",
							`Try copying and editing them!\n${command.examples}`,
							command.examples.length <= inlineCharacterLimit
						);
					}

					await msg.discord.channel.send(embed);
				}
				// else {
				// 	discordMsg.channel.send(
				// 		`${discordMsg.author}, Couldn't find the command "${lookUpCmd}"!`
				// 	);
				// }
			} else {
				const mainEmbed = EmbedHelper.getEmbedTemplate(
					msg.discord,
					this.framedClient,
					this.id
				);

				const botName = msg.discord.client.user?.username ? msg.discord.client.user?.username : "Pixel pete";

				mainEmbed
					.setTitle(botName)
					.setDescription(
						oneLine`${botName} is a collection of custom bots by <@200340393596944384> and 
						<@359521958519504926> for Game Dev Underground. 
						Bot created partly with the [Framed](https://github.com/som1chan/Framed) bot framework.`
					)
					.addFields(
						this.createMainHelpFields(
							msg.framedClient.pluginManager.plugins
						)
					);

				const data = await this.createInfoHelpFields(
					msg.framedClient.databaseManager
				);

				if (data) {
					mainEmbed.addFields(data);
				}

				mainEmbed.addField(
					"Other Bots",
					stripIndent`
						<@234395307759108106> \`-help\` - Used for music in the <#760622055384547368> voice channel.`
				);

				try {
					await msg.discord.channel.send(mainEmbed);					
				} catch (error) {
					await msg.discord.channel.send(`${msg.discord.author}, the embed size for help is too large! Contact one of the bot masters`)
					logger.error(error.stack);
				}
			}

			return true;
		}

		return true;
	}

	createMainHelpFields(
		plugins: Map<string, BasePlugin>
	): Discord.EmbedFieldData[] {
		const fields: Discord.EmbedFieldData[] = [];

		// const helpList: HelpCategory[] = [
		// 	{
		// 		category: "Info",
		// 		command: [
		// 			{
		// 				emote: "❓",
		// 				command: "help",
		// 			},
		// 			{
		// 				emote: "🏓",
		// 				command: "ping",
		// 			},
		// 			{
		// 				emote: "⌚",
		// 				command: "uptime",
		// 			},
		// 		],
		// 	},
		// 	{
		// 		category: "Fun",
		// 		command: [
		// 			{
		// 				emote: "👍",
		// 				command: "poll",
		// 			},
		// 		],
		// 	},
		// ];
		const helpList: HelpCategory[] = [
			{
				category: "Commands",
				command: [
					{
						command: "help",
					},
					{
						command: "usage",
					},
					{
						command: "poll",
					},
					{
						command: "dailies",
					},
				],
			},
		];
		const sectionMap = new Map<string, string>();

		// Loops through all of the help elements,
		// in order to find the right data
		helpList.forEach(helpElement => {
			// Searches through plugins
			plugins.forEach(plugin => {
				const allComamnds = Array.from(plugin.commands.values()).concat(
					Array.from(plugin.aliases.values())
				);

				// Searches through commands inside the plugins
				allComamnds.forEach(command => {
					// Searches through command text options
					helpElement.command.forEach(cmdElement => {
						// If there's a matching one, add it to the Map
						if (
							command.id == cmdElement.command ||
							command.aliases?.includes(cmdElement.command)
						) {
							const usage =
								command.usage && !command.hideUsageInHelp
									? ` ${command.usage}`
									: "";

							sectionMap.set(
								cmdElement.command,
								oneLine`
								${command.emojiIcon ? command.emojiIcon : "❔"}
								\`${command.defaultPrefix}${command.id}${usage}\`
								- ${command.about}
							`
							);
						}
					});
				});
			});
		});

		// Loops through all of the help elements,
		// in order to sort them properly like in the data
		helpList.forEach(helpElement => {
			let categoryText = "";

			// Goes through each command in help, and finds matches in order
			helpElement.command.forEach(cmdElement => {
				const cmdText = sectionMap.get(cmdElement.command);
				if (cmdText) {
					categoryText += `${cmdText}\n`;
				}
			});

			// Push everything from this category into a Embed field
			fields.push({
				name: helpElement.category,
				value: categoryText,
			});
		});

		return fields;
	}

	async createInfoHelpFields(
		databaseManager: DatabaseManager
	): Promise<Discord.EmbedFieldData[] | undefined> {
		const connection = databaseManager.connection;
		if (connection) {
			const fields: Discord.EmbedFieldData[] = [];
			const commandRepo = connection.getRepository(Command);
			const commands = await commandRepo.find({
				relations: ["defaultPrefix", "response"],
			});

			const contentNoDescriptionList: string[] = [];
			const contentList: string[] = [];

			for await (const command of commands) {
				let content = `\`${command.defaultPrefix.prefix}${command.id}\``;
				const description = command.response?.responseData?.description;

				if (description) {
					content = `🔹 ${content} - ${description}\n`;
					contentList.push(content);
				} else {
					content += ` `;
					contentNoDescriptionList.push(content);
				}
			}

			let content = "";
			contentNoDescriptionList.forEach(element => {
				content += element;
			});

			if (content.length > 0) {
				content += "\n";
			}

			contentList.forEach(element => {
				content += element;
			});

			if (content.length > 0) {
				fields.push({
					name: "Other Commands",
					value: content,
				});
				return fields;
			} else {
				return undefined;
			}
		}
		return undefined;
	}
}
