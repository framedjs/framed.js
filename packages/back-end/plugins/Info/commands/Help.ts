import Discord from "discord.js";
import EmbedHelper from "../../../src/utils/discord/EmbedHelper";
import FramedMessage from "../../../src/structures/FramedMessage";
import { BasePlugin } from "../../../src/structures/BasePlugin";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { oneLine, stripIndent } from "common-tags";
import { logger } from "shared";
import PluginManager, { HelpData } from "../../../src/managers/PluginManager";

const data: HelpData[] = [
	{
		category: ":information_source: Info",
		commands: ["help", "usage", "ping", "about", "dailies"],
	},
	{
		category: ":tada: Fun",
		commands: ["poll"],
	},
	{
		category: "🕒 Dailies",
		commands: ["dailies", "streaks", "alert", "casual"],
	},
];

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
			emojiIcon: "❓",
			inline: true,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		const framedUser = this.framedClient.client.user;

		if (msg.args && framedUser) {
			const lookUpCmd = msg.args[0];

			if (lookUpCmd) {
				return this.showHelpForCommand(lookUpCmd, msg);
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
					oneLine`
						Pixel Pete is a collection of custom bots for <:gdu:766718483983368212>
						**Game Dev Underground**, by <@200340393596944384>, <@359521958519504926>,
						and <@150649616772235264>. 
						`
				)
				.addFields(helpFields)
				.addField(
					"🤖 Other Bots",
					stripIndent`
						\`-help\` - <@234395307759108106> is used for music in the <#760622055384547368> voice channel.
						`
				)
				.addField(
					"Need a Custom Discord Bot?",
					oneLine`
						Send <@200340393596944384> a message on Discord!`
				);

			embed.setFooter(
				`${
					embed.footer?.text ? embed.footer.text : ""
				}\nUse .help <command> to see more info.`,
				embed.footer?.iconURL
			);

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

	/**
	 *
	 * @param lookUpCmd
	 * @param msg
	 */
	private async showHelpForCommand(
		lookUpCmd: string,
		msg: FramedMessage
	): Promise<boolean> {
		if (msg.discord) {
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
				const embed = EmbedHelper.getTemplate(
					msg.discord,
					this.framedClient.helpCommands,
					this.id
				)
					.setTitle(`${command.defaultPrefix}${command.id}`)
					.setDescription(description);
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
						command.inlineCharacterLimit
							? usageMsg.length <= command.inlineCharacterLimit
							: command.inline
					);
				}

				if (command.examples) {
					embed.addField(
						"Examples",
						`Try copying and editing them!\n${command.examples}`,
						command.inlineCharacterLimit
							? command.examples.length <=
									command.inlineCharacterLimit
							: command.inline
					);
				}

				await msg.discord.channel.send(embed);
				return true;
			}
		}
		return false;
	}
}
