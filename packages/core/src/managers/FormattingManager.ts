import { oneLineInlineLists } from "common-tags";
import { Logger } from "@framedjs/logger";
import { FoundCommandData } from "../interfaces/FoundCommandData";
import { Client } from "../structures/Client";
import { Message } from "../structures/Message";
import Discord from "discord.js";
import { BaseCommand } from "../structures/BaseCommand";
import { Place } from "../interfaces/Place";

export default class FormattingManager {
	constructor(readonly client: Client) {}

	/**
	 * Format custom $() formatting
	 *
	 * @param arg String to format
	 * @param place Place data
	 */
	async format(arg: string, place: Place): Promise<string> {
		// Matches $(test) pattern
		const regex = /(\$\(.*?\))/g;
		const array = [...arg.matchAll(regex)];

		for await (const element of array) {
			// Removes the $()
			const formatContent = element[0].slice(2, element[0].length - 1);
			const formatArgs = formatContent.split(" ");
			const formatCommand = formatArgs.shift();

			try {
				switch (formatCommand?.toLocaleLowerCase()) {
					case "command":
					case "commandnoprefix":
						arg = arg.replace(
							element[0],
							await this.parseCommand(
								formatArgs,
								formatContent,
								place,
								formatCommand == "commandnoprefix"
							)
						);
						break;
					default:
						throw new Error(`Invalid parameter ${formatCommand}`);
				}
			} catch (error) {
				Logger.error(error.stack);
			}
		}

		return arg;
	}

	/**
	 * Returns the command
	 *
	 * @param formatArgs
	 * @param formatContent
	 * @param place
	 * @param noPrefix
	 */
	async parseCommand(
		formatArgs: string[],
		formatContent: string,
		place: Place,
		noPrefix?: boolean
	): Promise<string> {
		// If this is true, the first parameter is a plugin ID
		if (formatArgs[0]?.includes(".")) {
			// Gets the correct data for the getter function
			const pluginId = formatArgs[0];
			const commandId: string | undefined = formatArgs[1];
			const argsContent = formatContent
				.replace(pluginId, "")
				.replace(commandId, "");
			const args = Message.getArgs(argsContent);

			if (!commandId) {
				throw new Error(
					`For parse content "${formatContent}"; parameter "command" is undefined`
				);
			}

			const foundData = (
				await this.client.plugins.getFoundCommandData(
					commandId,
					args,
					place
				)
			)[0];
			if (foundData) {
				return this.getCommandRan(foundData, place, noPrefix);
			} else {
				throw new ReferenceError(
					`Command found data is undefined: $(${formatContent})`
				);
			}
		} else {
			// Assume it's just the command with some subcommands attached
			const commandId: string | undefined = formatArgs[0];
			const argsContent = formatContent.replace(commandId, "");
			const args = Message.getArgs(argsContent);

			const foundData = (
				await this.client.plugins.getFoundCommandData(
					commandId,
					args,
					place
				)
			)[0];
			if (foundData) {
				return this.getCommandRan(foundData, place, noPrefix);
			} else {
				throw new ReferenceError(`Command found data is undefined`);
			}
		}
	}

	/**
	 * Returns a string like "!command args"
	 *
	 * @param foundData
	 * @param place
	 * @param noPrefix Should the prefix be included?
	 */
	getCommandRan(
		foundData: FoundCommandData,
		place: Place,
		noPrefix?: boolean
	): string {
		// Sets the prefix string to nothing, if the setting says to not use a prefix
		const prefixString = noPrefix
			? ""
			: foundData.command.getDefaultPrefix(place);

		// Get the IDs fo all the subcommands, and puts them into a list separated by spaces
		const subcommandIds: string[] = [];
		foundData.subcommands.forEach(subcommand => {
			subcommandIds.push(subcommand.id);
		});
		const subcommandString = `${oneLineInlineLists`${subcommandIds}`}`;

		// Returns command in the format of `!command subcommand`
		return `${prefixString}${foundData.command.id} ${subcommandString}`.trim();
	}

	/**
	 * Formats an entire Discord embed
	 *
	 * @param embed Discord Embed
	 *
	 * @returns Formatted Discord embed
	 */
	async formatEmbed(
		embed: Discord.MessageEmbed | Discord.MessageEmbedOptions,
		place: Place
	): Promise<Discord.MessageEmbed> {
		if (embed.description) {
			try {
				embed.description = await Message.format(
					embed.description,
					this.client,
					place
				);
			} catch (error) {
				Logger.error(error.stack);
			}
		}

		if (embed.fields) {
			for await (const field of embed.fields) {
				try {
					field.name = await Message.format(
						field.name,
						this.client,
						place
					);
				} catch (error) {
					Logger.error(error.stack);
				}
				try {
					field.value = await Message.format(
						field.value,
						this.client,
						place
					);
				} catch (error) {
					Logger.error(error.stack);
				}
			}
		}

		if (embed.footer?.text) {
			try {
				embed.footer.text = await Message.format(
					embed.footer.text,
					this.client,
					place
				);
			} catch (error) {
				Logger.error(error.stack);
			}
		}

		if (embed instanceof Discord.MessageEmbed) {
			return embed;
		} else {
			return new Discord.MessageEmbed(embed);
		}
	}

	/**
	 * Parses custom {{}} formatting
	 *
	 * @param arg String to parse
	 * @param command Command to get the variables from
	 * @param place
	 */
	formatCommandNotation(
		arg: string | undefined,
		command: BaseCommand,
		place: Place
	): string | undefined {
		if (arg) {
			let prefix = command.getDefaultPrefix(place);

			// Fallback
			if (!prefix) {
				try {
					throw new Error("Default prefix wasn't found");
				} catch (error) {
					Logger.error(error.stack);
				}
				prefix = command.defaultPrefix.default;
			}

			return arg
				.replace(/{{prefix}}/gi, prefix)
				.replace(/{{id}}/gi, command.id);
		}
	}
}
