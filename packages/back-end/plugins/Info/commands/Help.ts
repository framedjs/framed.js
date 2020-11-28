import Discord from "discord.js";
// import * as Pagination from "discord-paginationembed";
import EmbedHelper from "../../../src/utils/discord/EmbedHelper";
import FramedMessage from "../../../src/structures/FramedMessage";
import { BasePlugin } from "../../../src/structures/BasePlugin";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { oneLine, stripIndent } from "common-tags";
import { logger } from "shared";
import PluginManager from "packages/back-end/src/managers/PluginManager";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "help",
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
				const embed = EmbedHelper.getEmbedTemplate(
					msg.discord,
					this.framedClient,
					this.id
				);

				const botName = msg.discord.client.user?.username
					? msg.discord.client.user?.username
					: "Pixel pete";

				embed.setTitle(botName).setDescription(
					oneLine`${botName} is a collection of custom bots by <@200340393596944384> and 
						<@359521958519504926> for Game Dev Underground. 
						Bot created partly with the [Framed](https://github.com/som1chan/Framed) bot framework.`
				);

				const mainData = PluginManager.createMainHelpFields(
					this.framedClient.pluginManager.plugins,
					this.framedClient.shortHelpInfo
				);

				if (mainData) {
					embed.addFields(mainData);
				}

				const infoData = await PluginManager.createDBHelpFields(
					msg.framedClient.databaseManager
				);

				if (infoData) {
					embed.addFields(infoData);
				}

				embed.addField(
					"Other Bots",
					stripIndent`
						<@234395307759108106> \`-help\` - Used for music in the <#760622055384547368> voice channel.`
				);

				try {
					await msg.discord.channel.send(embed);
				} catch (error) {
					await msg.discord.channel.send(
						`${msg.discord.author}, the embed size for help is too large! Contact one of the bot masters`
					);
					logger.error(error.stack);
				}
			}

			return true;
		}

		return true;
	}
}
