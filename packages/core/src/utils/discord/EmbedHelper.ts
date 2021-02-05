import Discord from "discord.js";
import { Logger } from "@framedjs/logger";
import { DiscordMessage } from "../../interfaces/DiscordMessage";
import { Client } from "../../structures/Client";
import FormattingManager from "../../managers/FormattingManager";
import { Place } from "../../interfaces/Place";
import { Message } from "../../structures/Message";

export interface RawTemplateSettings {
	/**
	 * Bot username
	 */
	botUsername: string;

	/**
	 * Bot avatar URL
	 */
	botAvatarUrl?: string;

	/**
	 * Author avatar URL
	 */
	authorAvatarUrl?: string;

	/**
	 * Discord color resolvable
	 */
	color: string;

	/**
	 * Command used (as a non-alias) to be removed from a list
	 */
	commandUsed: string;

	/**
	 * All possible commands in an array
	 */
	commands: string[];

	/**
	 * Embed to base the chagnes off of
	 */
	embed?: Discord.MessageEmbed;
}

export interface ObjectTemplateSettings {
	/**
	 * Message object or Discord message
	 */
	msg: Discord.Message | DiscordMessage;

	/**
	 * Framed client
	 */
	client: Client;

	/**
	 * Command used (as a non-alias) to be removed from a list
	 */
	commandUsed?: string;

	/**
	 * All possible commands in an array
	 */
	commands?: string[];

	/**
	 * Embed to base the chagnes off of
	 */
	embed?: Discord.MessageEmbed;
}

/**
 * Discord Embed helper function class
 */
export class EmbedHelper {
	static defaultColor = process.env.DEFAULT_EMBED_COLOR
		? process.env.DEFAULT_EMBED_COLOR
		: "#ffffff";

	/**
	 * Gets a color for generating embeds
	 * @param guild - Discord message object
	 */
	static getColorWithFallback(
		guild: Discord.Guild | null | undefined,
		defaultColor: Discord.ColorResolvable = this.defaultColor
	): Discord.ColorResolvable {
		// If guild doesn't exist, just return any value
		if (!guild) {
			return defaultColor;
		}

		const client = guild.client;
		let botColor: Discord.ColorResolvable = "";

		if (client.user) {
			if (
				guild?.available &&
				process.env.USE_DEFAULT_EMBED_COLOR_ALWAYS?.toLocaleLowerCase() !=
					"true"
			) {
				// Grabs the primary role's color the bot has
				const member = guild.members.cache.get(client.user.id);
				if (member) {
					botColor = member.displayHexColor;
				} else {
					Logger.warn(`Unable to find member of self on guild?`);
				}
			}

			// If the guild isn't availiable (or in DMs), we fallback to a preset color
			if (botColor == "#000000" || botColor == "") {
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
	 * @param footer Discord footer
	 * @param baseEmbed Base Discord embed to apply the template to
	 *
	 * @returns Discord embed
	 */
	static getTemplate(
		msg: Discord.Message | DiscordMessage,
		footer?: Discord.MessageEmbedFooter,
		baseEmbed?: Discord.MessageEmbed
	): Discord.MessageEmbed {
		const newEmbed = new Discord.MessageEmbed(baseEmbed)
			.setFooter(footer?.text, footer?.iconURL)
			.setColor(EmbedHelper.getColorWithFallback(msg.guild));

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
	static getTemplateRaw(
		color: Discord.ColorResolvable,
		footer?: Discord.MessageEmbedFooter,
		baseEmbed?: Discord.MessageEmbed
	): Discord.MessageEmbed {
		return new Discord.MessageEmbed(baseEmbed)
			.setFooter(footer?.text, footer?.iconURL)
			.setColor(EmbedHelper.getColorWithFallback(null, color));
	}

	/**
	 * Related to applyEmbedTemplate()
	 * @param commandUsed - Command used
	 * @param commands - Command list
	 */
	static async getCommandsSeparated(
		formatter: FormattingManager,
		place: Place,
		commands?: Array<string>,
		commandUsed?: string
	): Promise<string> {
		// If there's no commands, its safe to return nothing
		if (!commands || commands?.length == 0) {
			return "";
		}

		// This might be completely unnessesary, but just in case
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

	static async getCheckOutFooter(
		msg: Message,
		commandId?: string
	): Promise<Discord.MessageEmbedFooter>;

	static async getCheckOutFooter(
		formatter: FormattingManager,
		place: Place,
		helpCommands: string[],
		commandId?: string
	): Promise<Discord.MessageEmbedFooter>;

	static async getCheckOutFooter(
		msgOrFormatter: Message | FormattingManager,
		commandIdOrPlace?: string | Place,
		helpCommands?: string[],
		commandId?: string
	): Promise<Discord.MessageEmbedFooter> {
		let text = "";
		if (msgOrFormatter instanceof Message) {
			text = await this.getCommandsSeparated(
				msgOrFormatter.client.formatting,
				Message.discordGetPlace(
					msgOrFormatter.client,
					msgOrFormatter.discord?.guild
				),
				msgOrFormatter.client.helpCommands,
				commandId
			);
		} else {
			if (typeof commandIdOrPlace == "string") {
				throw new Error(
					"formatterOrCommandId is a string, not an instance of FormattingManager"
				);
			} else if (!commandIdOrPlace) {
				throw new ReferenceError("formatterOrCommandId is undefined");
			}

			text = await this.getCommandsSeparated(
				msgOrFormatter,
				commandIdOrPlace,
				helpCommands,
				commandId
			);
		}

		if (text.length > 0) {
			return {
				text: `Check out: ${text}`,
			};
		} else {
			return { text: "" };
		}
	}
}
