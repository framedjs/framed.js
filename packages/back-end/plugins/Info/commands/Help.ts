import Discord from "discord.js";
// import * as Pagination from "discord-paginationembed";
import * as DiscordUtils from "../../../src/utils/DiscordUtils";
import FramedClient from "packages/back-end/src/structures/FramedClient";
import FramedMessage from "../../../src/structures/FramedMessage";
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
			name: "Help",
			aliases: ["h"],
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
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		const discordMsg = msg.discord?.msg;
		const framedUser = this.framedClient.client.user;

		if (msg.args && discordMsg && framedUser) {
			const lookUpCmd = msg.args[0];

			// Checks for a parameter
			if (lookUpCmd) {
				const matchingCommands: BaseCommand[] = [];

				const plugins = this.framedClient.pluginManager.plugins;
				plugins.forEach(plugin => {
					const command = plugin.commands.get(lookUpCmd);
					if (command) {
						matchingCommands.push(command);
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
					const embed = DiscordUtils.applyEmbedTemplate(
						discordMsg,
						this.id,
						cmdList
					)
						.setTitle(`${command.prefix}${command.id}`)
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
					console.log("AAAAAAAAAAAAAA " + inlineCharacterLimit);

					if (command.usage) {
						const guideMsg = stripIndent`
							Type \`.usage\` for more info.
						`;
						const usageMsg = stripIndent`
							\`${command.prefix}${command.id} ${command.usage}\`
						`;
						embed.addField(
							"Usage",
							`${usageMsg}\n${guideMsg}`,
							usageMsg.length <= inlineCharacterLimit
						);
					}

					if (command.examples) {
						embed.addField(
							"Examples",
							command.examples,
							command.examples.length <= inlineCharacterLimit
						);
					}

					await discordMsg.channel.send(embed);
				}
				// else {
				// 	discordMsg.channel.send(
				// 		`${discordMsg.author}, Couldn't find the command "${lookUpCmd}"!`
				// 	);
				// }
			} else {
				const mainEmbed = DiscordUtils.applyEmbedTemplate(
					discordMsg,
					this.id,
					cmdList
				);

				mainEmbed
					.setDescription(
						oneLine`Pixel Pete is a collection of custom bots by <@200340393596944384> and 
						<@359521958519504926> for Game Dev Underground. 
						Bot created partly with the [Framed](https://github.com/som1chan/Framed) bot framework.`
					)
					.addFields(this.createMainHelpFields(msg.framedClient))
					.addField(
						"Other Bots",
						stripIndent`
						<@159985870458322944> \`!help\` - Bot generally used for \`!levels\` and \`!rank\`.
						<@234395307759108106> \`-help\` - Used for music in <#760622055384547368>.
					`
					);

				await discordMsg.channel.send(mainEmbed);
			}

			return true;
		}

		return true;
	}

	createMainHelpFields(framedClient: FramedClient): Discord.EmbedFieldData[] {
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
						emote: "❓",
						command: "help",
					},
					{
						emote: "📄",
						command: "usage",
					},
					{
						emote: "🏓",
						command: "ping",
					},
					{
						emote: "👍",
						command: "poll",
					},
				],
			},
		];
		const sectionMap = new Map<string, string>();
		const plugins = framedClient.pluginManager.plugins;

		// Loops through all of the help elements,
		// in order to find the right data
		helpList.forEach(helpElement => {
			// Searches through plugins
			plugins.forEach(plugin => {
				// Searches through commands inside the plugins
				plugin.commands.forEach(command => {
					// Searches through command text options
					helpElement.command.forEach(cmdElement => {
						// If there's a matching one, add it to the Map
						if (command.id == cmdElement.command) {
							const usage =
								command.usage && !command.hideUsageInHelp
									? ` ${command.usage}`
									: "";

							sectionMap.set(
								cmdElement.command,
								oneLine`
								${cmdElement.emote}
								\`${command.prefix}${command.id}${usage}\`
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

		// fields.push({
		// 	"Streaks",
		// 	`🕒 \`.streaks [@user | user ID | top | all]\` - View streak stats.`
		// });

		return fields;
	}
}
