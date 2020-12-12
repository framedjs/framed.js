/* eslint-disable no-mixed-spaces-and-tabs */
import EmbedHelper from "../../../src/utils/discord/EmbedHelper";
import FramedMessage from "../../../src/structures/FramedMessage";
import { BasePlugin } from "../../../src/structures/BasePlugin";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { oneLine, oneLineInlineLists, stripIndent } from "common-tags";
import { logger } from "shared";
import { HelpData } from "../../../src/managers/PluginManager";

const data: HelpData[] = [
	{
		group: "Info",
		commands: ["help", "usage", "about", "ping"],
	},
	{
		group: "Fun",
		commands: ["poll"],
	},
	{
		group: "Dailies",
		commands: ["dailies", "streaks", "alert", "casual"],
	},
];

export default class Help extends BaseCommand {
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
			inline: true,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		const framedUser = this.framedClient.client.user;

		if (msg.args && framedUser) {
			if (msg.args[0]) {
				return this.showHelpForCommand(msg.args, msg);
			} else {
				return this.showHelpAll(msg);
			}
		}
		return false;
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
				.setTitle("Command Help")
				.setDescription(
					stripIndent`
					For more info about this bot, use the \`.about\` command.
					For more info on certain commands, use \`.help poll\` (or a different command)!
					`
				)
				.addFields(helpFields)
				.addField(
					"🤖 Other Bots",
					stripIndent`
					\`-help\` - <@234395307759108106> is used for music in the <#760622055384547368> voice channel.
					`
				);
			// .addField(
			// 	"Need a Custom Discord Bot?",
			// 	oneLine`
			// 		Send <@200340393596944384> a message on Discord!`
			// );

			// embed.setFooter(
			// 	`${
			// 		embed.footer?.text ? embed.footer.text : ""
			// 	}\nUse .help [command] to see more info.`,
			// 	embed.footer?.iconURL
			// );

			try {
				await msg.discord.channel.send(embed);
			} catch (error) {
				logger.error(error.stack);
				await msg.discord.channel.send(
					`${msg.discord.author}, the embed size for help is too large! Contact one of the bot masters.`
				);
			}
			return true;
		}
		return false;
	}

	/**
	 *
	 * @param lookUpCmd
	 * @param msg
	 */
	private async showHelpForCommand(
		args: string[],
		msg: FramedMessage
	): Promise<boolean> {
		if (msg.discord && args[0]) {
			const newArgs = [...args];
			const command = newArgs.shift();

			if (command) {
				const matchingCommands = this.framedClient.pluginManager.getCommands(
					command
				);

				for await (const command of matchingCommands) {
					// Get potential subcommand
					const subcommands = command.getSubcommandChain(newArgs);
					const finalSubcommand = subcommands[subcommands.length - 1];
					const subcommandIds: string[] = [];

					subcommands.forEach(subcommand => {
						subcommandIds.push(subcommand.id);
					});

					const commandRan = `${command.defaultPrefix}${
						command.id
					} ${oneLineInlineLists`${subcommandIds}`}`.trim();

					const embed = EmbedHelper.getTemplate(
						msg.discord,
						this.framedClient.helpCommands,
						this.id
					).setTitle(commandRan);

					// .addField(
					// 	`${command.plugin.name} Plugin`,
					// 	`\`${command.prefix}${command.id}\`\n${description}`
					// );

					// if (command.aliases) {
					// 	let aliasString = "";
					// 	const newElementCharacter = command.inline ? "\n" : " ";

					// 	for (const alias of command.aliases) {
					// 		aliasString += `\`${alias}\`${newElementCharacter}`;
					// 	}
					// 	if (aliasString.length > 0)
					// 		embed.addField("Aliases", aliasString, command.inline);
					// }

					// The command/subcommand that has the data needed
					const primaryCommand = finalSubcommand
						? finalSubcommand
						: command;

					// Get the description
					let description = primaryCommand.description;
					if (!description) {
						if (primaryCommand.about) {
							description = primaryCommand.about;
						} else {
							description = `*No about or description set for the command.*`;
						}
					}
					embed.setDescription(description);

					// Gets the usage text
					if (primaryCommand.usage) {
						const guideMsg = `Type \`.usage\` for important info.`;
						const usageMsg = `\`${commandRan} ${primaryCommand.usage}\``;
						const useInline = primaryCommand.inlineCharacterLimit
							? usageMsg.length <=
							  primaryCommand.inlineCharacterLimit
							: primaryCommand.inline;
						embed.addField(
							"Usage",
							`${guideMsg}\n${usageMsg}`,
							useInline
						);
					}

					// Get the examples text
					if (primaryCommand.examples) {
						const useInline = primaryCommand.inlineCharacterLimit
							? primaryCommand.examples.length <=
							  primaryCommand.inlineCharacterLimit
							: primaryCommand.inline;
						embed.addField(
							"Examples",
							`Try copying and editing them!\n${primaryCommand.examples}`,
							useInline
						);
					}

					await msg.discord.channel.send(embed);
					return true;
				}
			}
		}
		return false;
	}
}
