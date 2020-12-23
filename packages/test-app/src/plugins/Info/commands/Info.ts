/* eslint-disable no-mixed-spaces-and-tabs */
import {
	FramedMessage,
	BasePlugin,
	BaseCommand,
	PluginManager,
} from "back-end";
import { oneLine, oneLineInlineLists, stripIndent } from "common-tags";
import Help from "./Help";
import Discord from "discord.js";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "info",
			aliases: ["i", "analyze", "inspect"],
			about: `Analyzes commands in more detail than \`$(command default.bot.info.command.help)\`.`,
			description: oneLine`
			Analyzes commands in more detail than \`$(command default.bot.info.command.help)\`.
			This includes aliases.
			`,
			usage: "[command]",
			examples: stripIndent`
			\`{{prefix}}{{id}} help\`
			\`{{prefix}}{{id}} streaks\`
			`,
			inline: true,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		const framedUser = this.framedClient.client.user;

		if (msg.args && framedUser) {
			if (msg.args[0]) {
				// Send info through Embed
				if (msg.discord) {
					const embeds = await Help.showHelpForCommand(
						msg.args,
						msg,
						this.id,
						this.processEmbedForHelp
					);
					for await (const embed of embeds) {
						await msg.discord.channel.send(embed);
					}
				}
			} else {
				await PluginManager.showHelpForCommand(msg);
			}
		}
		return false;
	}

	/**
	 * Creates embeds containing help data
	 * @param msg Framed Message
	 * @param id Command ID for embed
	 * @param newArgs Message arguments
	 * @param command BaseCommand
	 */
	private async processEmbedForHelp(
		msg: FramedMessage,
		id: string,
		newArgs: string[],
		command: BaseCommand
	): Promise<Discord.MessageEmbed | undefined> {
		const embed = await Help.generateEmbedForHelp(msg, id, newArgs, command);

		if (!msg.discord || !embed) return undefined;

		// Handles adding aliases
		if (command.aliases) {
			let aliasString = "";
			const newElementCharacter = command.inline ? "\n" : " ";

			for (const alias of command.aliases) {
				aliasString += `\`${alias}\`${newElementCharacter}`;
			}
			if (aliasString.length > 0) {
				embed.addField("Aliases", aliasString, command.inline);
			}
		}

		// Handles prefixes
		const prefixesStrings: string[] = [];
		command.prefixes.forEach(prefix => {
			prefixesStrings.push(`\`${prefix}\``);
		});
		const prefixString = oneLineInlineLists`${prefixesStrings}`;
		embed.addField(
			"Prefixes",
			prefixString,
			Help.useInline(command, prefixString)
		);

		// Handles plugin IDs
		embed.addField(
			"Plugin ID",
			`\`${command.plugin.id}\``,
			Help.useInline(command, prefixString)
		);

		return embed;
	}
}
