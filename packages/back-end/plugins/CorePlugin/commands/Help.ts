import Message from "../../../src/structures/Message";
import Discord from "discord.js";
import * as DiscordUtils from "../../../src/util/DiscordUtils";
import { Command, CommandClass } from "../../../src/structures/Command";
import { framedClient } from "../../../src/index";
import FramedClient from "packages/back-end/src/FramedClient";

const cmdList = ["help", "ping"];

@Command()
default class extends CommandClass {
	constructor() {
		super({
			id: "help",
			fullId: "core.bot.main.help",
			defaultPrefix: ".",
			name: "help",
			about: "View help for certain commands and extra info.",
			usage: "[command]",
		});
	}

	async run(msg: Message): Promise<boolean> {
		const discordMsg = msg.discord?.msg;
		const framedUser = framedClient.client.user;

		if (msg.args && discordMsg && framedUser) {
			const lookUpCmd = msg.args[0];

			// Checks for a parameter
			if (lookUpCmd) {
				if (this.plugin) {
					const plugin = this.plugin;
					const command = plugin.commands.get(lookUpCmd);

					if (command) {
						// const plugins = msg.framedClient.pluginManager.plugins;
						// const pluginList = Array.from(plugins.values());
						// pluginList.forEach(element => {
						// 	const commands = Array.from(element.commands.values());
						// });

						discordMsg.channel.send(
							DiscordUtils.applyEmbedTemplate(
								discordMsg,
								this.info.id,
								cmdList
							)
								// .setTitle("Command Info")
								.addField(
									`Command: ${command.info.name}`,
									`\`${command.info.defaultPrefix}${command.info.id}\`\n${command.info.about}`
								)
						);
					} else {
						discordMsg.channel.send(
							`${discordMsg.author}, Couldn't find the command "${lookUpCmd}"!`
						);
					}
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
					.addFields(this.createMainHelpFields(msg.framedClient))
					.addField(
						"Streaks",
						`🕒 \`.streaks [@user | user ID | top | all]\` - View streak stats.`
					);
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
				category: "General",
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
						emote: "❤",
						command: "fail",
					},
				],
			},
		];

		const plugins = framedClient.pluginManager.plugins;

		// Loops through all of the help elements
		helpList.forEach(helpElement => {
			let section = "";

			plugins.forEach(plugin => {
				plugin.commands.forEach(command => {
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

interface HelpCategory {
	category: string;
	command: HelpInfo[];
}

interface HelpInfo {
	emote: string;
	command: string;
}
