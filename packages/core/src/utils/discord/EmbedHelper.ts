import Discord from "discord.js";
import { Logger } from "@framedjs/logger";
import { FormattingManager } from "../../managers/FormattingManager";
import { BaseMessage } from "../../structures/BaseMessage";
import type { DiscordInteractionData } from "../../interfaces/DiscordInteractionData";
import type { DiscordMessageData } from "../../interfaces/DiscordMessageData";
import type { Place } from "../../interfaces/Place";

/**
 * Discord Embed helper function class
 */
export class EmbedHelper {
	static get defaultColor(): Discord.ColorResolvable {
		return process.env.DEFAULT_EMBED_COLOR
			? process.env.DEFAULT_EMBED_COLOR[0] == "#"
				? (process.env.DEFAULT_EMBED_COLOR as Discord.ColorResolvable)
				: `#${process.env.DEFAULT_EMBED_COLOR}`
			: "#ffffff";
	}

	/**
	 * Gets a color for generating embeds
	 *
	 * @param guild Discord message object
	 * @param defaultColor Discord color resolvable
	 *
	 * @returns Discord color resolvable
	 */
	static async getColorWithFallback(
		guild: Discord.Guild | null | undefined,
		defaultColor: Discord.ColorResolvable = this.defaultColor
	): Promise<Discord.ColorResolvable> {
		// If guild doesn't exist, just return any value
		if (!guild) {
			return defaultColor;
		}

		const client = guild.client;
		let botColor: Discord.ColorResolvable = "#";

		if (client.user) {
			if (
				guild?.available &&
				process.env.USE_DEFAULT_EMBED_COLOR_ALWAYS?.toLocaleLowerCase() !=
					"true"
			) {
				// Grabs the primary role's color the bot has
				try {
					const me = await guild.members.fetchMe();
					if (me) {
						botColor = me.displayHexColor;
					} else {
						Logger.warn(`Unable to find member of self on guild?`);
					}
				} catch (error) {
					Logger.error((error as Error).stack);
				}
			}

			// If the guild isn't available (or in DMs), we fallback to a preset color
			if (botColor == "#000000" || botColor == "#") {
				botColor = defaultColor;
			}
		}

		return botColor;
	}

	/**
	 * Applies a Discord embed template that should
	 * (hopefully) be a consistent design language.
	 *
	 * @param msg Message object or Discord message
	 * @param footer Discord footer data
	 * @param baseEmbed Base Discord embed to apply the template to
	 *
	 * @returns Discord embed
	 */
	static async getTemplate(
		msg:
			| Discord.Message
			| DiscordMessageData
			| Discord.Interaction
			| DiscordInteractionData,
		footer?: Discord.EmbedFooterData,
		baseEmbed?: Discord.EmbedData
	): Promise<Discord.EmbedBuilder> {
		const newEmbed = new Discord.EmbedBuilder(baseEmbed).setColor(
			await EmbedHelper.getColorWithFallback(msg.guild)
		);
		if (footer) newEmbed.setFooter(footer);
		return newEmbed;
	}

	/**
	 * Applies a Discord embed template that should
	 * (hopefully) be a consistent design language.
	 *
	 * Use EmbedHelper.getTemplate() if you have access to those parameters,
	 * as that would be more simpler.
	 *
	 * @param color Discord color resolvable
	 * @param footer Discord Footer data
	 * @param baseEmbed Base Discord embed to apply the template to
	 *
	 * @returns Discord embed
	 */
	static async getTemplateRaw(
		color: Discord.ColorResolvable,
		footer?: Discord.EmbedFooterData,
		baseEmbed?: Discord.EmbedData
	): Promise<Discord.EmbedBuilder> {
		const newEmbed = new Discord.EmbedBuilder(baseEmbed).setColor(
			await EmbedHelper.getColorWithFallback(null, color)
		);
		if (footer) newEmbed.setFooter(footer);
		return newEmbed;
	}

	/**
	 * Internal function, related to {@link EmbedHelper.getCheckOutFooter()}.
	 *
	 * @param commandUsed - Command used
	 * @param commands - Command list
	 *
	 * @returns Commands that are used
	 */
	protected static async _getCommandsSeparated(
		formatter: FormattingManager,
		place: Place,
		commands?: Array<string>,
		commandUsed?: string
	): Promise<string> {
		// If there's no commands, its safe to return nothing
		if (!commands || commands?.length == 0) {
			return "";
		}

		// This might be completely unnecessary, but just in case
		// https://stackoverflow.com/questions/44808882/cloning-an-array-in-javascript-typescript
		const clonedArray: string[] = Object.assign([], commands);

		// Removes the command used, if the environment variables say so
		if (
			commandUsed &&
			process.env.PRUNE_COMMAND_LIST?.toLocaleLowerCase() == "true"
		) {
			// Splices out the command so we only show new commands
			clonedArray.splice(clonedArray.indexOf(commandUsed), 1);
		}

		// Gets all the unformatted commands, and separates them out in the string
		let output = ``;
		for (let i = 0; i < clonedArray.length; i++) {
			output += clonedArray[i];

			// If the element isn't the last element, add the " | "
			if (i != clonedArray.length - 1) {
				output += " | ";
			}
		}

		// Formats the command output, and returns the value
		return formatter.format(output, place);
	}

	/**
	 * Gets default footer data.
	 *
	 * @param msg BaseMessage object
	 * @param commandId Command ID
	 *
	 * @returns Embed footer data
	 */
	static async getCheckOutFooter(
		msg: BaseMessage,
		commandId?: string
	): Promise<Discord.EmbedFooterData>;

	/**
	 * Gets default footer data.
	 *
	 * @param formatter
	 * @param place
	 * @param helpCommands
	 * @param commandId
	 *
	 * @returns Embed footer data
	 */
	static async getCheckOutFooter(
		formatter: FormattingManager,
		place: Place,
		helpCommands: string | string[],
		commandId?: string
	): Promise<Discord.EmbedFooterData>;

	/**
	 * Gets default footer data.
	 *
	 * @param msgOrFormatter
	 * @param commandIdOrPlace
	 * @param footer
	 * @param commandId
	 *
	 * @returns Embed footer data
	 */
	static async getCheckOutFooter(
		msgOrFormatter: BaseMessage | FormattingManager,
		commandIdOrPlace?: string | Place,
		footer: string | string[] = "",
		commandId?: string
	): Promise<Discord.EmbedFooterData | undefined> {
		let formatter: FormattingManager;
		let place: Place;

		// Attempts to get variables
		if (msgOrFormatter instanceof BaseMessage) {
			formatter = msgOrFormatter.client.formatting;
			place = await BaseMessage.discordGetPlace(
				msgOrFormatter.client,
				msgOrFormatter.discord?.guild
			);
			footer = msgOrFormatter.client.footer;
		} else {
			if (typeof commandIdOrPlace == "string") {
				throw new Error(
					"formatterOrCommandId is a string, not an instance of FormattingManager"
				);
			} else if (!commandIdOrPlace) {
				throw new ReferenceError("formatterOrCommandId is undefined");
			}

			formatter = msgOrFormatter;
			place = commandIdOrPlace;
			footer = footer ? footer : "";
		}

		// Returns a "check out" formatting, or just some text
		if (typeof footer == "string") {
			if (!footer) return;
			return {
				text: footer,
			};
		} else {
			const commandString = await this._getCommandsSeparated(
				formatter,
				place,
				footer,
				commandId
			);
			if (commandString.trim()) {
				return {
					text: `Check out: ${commandString}`,
				};
			}
		}
		return;
	}
}
