import Discord from "discord.js";
import { logger, Utils } from "shared";
import { FramedDiscordMessage } from "../../interfaces/FramedDiscordMessage";
import FramedClient from "../../structures/FramedClient";

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
	 * FramedMessage object or Discord message
	 */
	msg: Discord.Message | FramedDiscordMessage;

	/**
	 * Framed client
	 */
	framedClient: FramedClient;

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
export default class EmbedHelper {
	/**
	 * Gets a color for generating embeds
	 * @param guild - Discord message object
	 */
	static getColorWithFallback(
		guild: Discord.Guild | null | undefined,
		defaultColor = "#ffffff"
	): string {
		// If guild doesn't exist, just return any value
		if (!guild) {
			return defaultColor;
		}

		const client = guild.client;
		let botColor = "";

		if (client.user) {
			if (guild?.available) {
				// Grabs the primary role's color the bot has
				const member = guild.members.cache.get(client.user.id);
				if (member) {
					botColor = member.displayHexColor;
				} else {
					logger.warn(`Unable to find member of self on guild?`);
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
	 * @param msg FramedMessage object or Discord message
	 * @param commands Commands listed under check out footer message. In most cases, use `framedClient.helpCommands`.
	 * @param commandUsed Command used (as a non-alias) to be potentially removed from a list.
	 * @param baseEmbed Base Discord embed to apply the template to
	 *
	 * @returns Discord embed
	 */
	static getTemplate(
		msg: Discord.Message | FramedDiscordMessage,
		commands: string[],
		commandUsed?: string,
		baseEmbed?: Discord.MessageEmbed
	): Discord.MessageEmbed {
		let tempUrl: string | null | undefined;

		tempUrl = msg.author.displayAvatarURL({ dynamic: true })
			? msg.author.displayAvatarURL({ dynamic: true })
			: msg.client.user?.defaultAvatarURL;
		const authorAvatarUrl = Utils.turnUndefinedIfNull(tempUrl) as string;

		tempUrl = msg.client.user?.avatarURL({ dynamic: true });

		const newEmbed = new Discord.MessageEmbed(baseEmbed)
			.setFooter(
				EmbedHelper.getCheckOutText(commands, commandUsed),
				authorAvatarUrl
			)
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
	 * @param commands Commands listed under check out footer message
	 * @param color Discord color resolvable
	 * @param footerUrl Footer avatar URL
	 * @param baseEmbed Base Discord embed to apply the template to
	 * @param commandUsed Command used (as a non-alias) to potentially be removed from a list
	 *
	 * @returns Discord embed
	 */
	static getTemplateRaw(
		commands: string[],
		color: Discord.ColorResolvable,
		footerUrl?: string,
		baseEmbed?: Discord.MessageEmbed,
		commandUsed?: string
	): Discord.MessageEmbed {
		footerUrl = Utils.turnUndefinedIfNull(footerUrl) as string;

		const newEmbed = new Discord.MessageEmbed(baseEmbed)
			.setFooter(
				EmbedHelper.getCheckOutText(commands, commandUsed),
				footerUrl
			)
			.setColor(color);

		return newEmbed;
	}

	/**
	 * Related to applyEmbedTemplate()
	 * @param commandUsed - Command used
	 * @param commands - Command list
	 */
	static getCheckOutText(
		commands?: Array<string>,
		commandUsed?: string
	): string {
		// This might be completely unnessesary, but just in case
		// https://stackoverflow.com/questions/44808882/cloning-an-array-in-javascript-typescript
		const clonedArray: string[] = Object.assign([], commands);

		if (
			commandUsed &&
			process.env.PRUNE_COMMAND_LIST?.toLocaleLowerCase() == "true"
		) {
			// Splices out the command so we only show new commands
			clonedArray.splice(clonedArray.indexOf(commandUsed), 1);
		}

		let output = `Check out: `;

		for (let i = 0; i < clonedArray.length; i++) {
			const element = clonedArray[i];
			if (!process.env.PREFIX) process.env.PREFIX = "";
			output += `${process.env.PREFIX}${element}`;

			// If it's not the last one, put a
			if (i != clonedArray.length - 1) {
				output += " | ";
				// output += "  ";
			}
		}

		return `${output}`;
	}

	/**
	 * Adds the version number of the bot to an embed
	 * @param embed Discord embed
	 */
	static applyVersionInFooter(
		embed: Discord.MessageEmbed,
		name: string,
		version: string
	): Discord.MessageEmbed {
		const environment = process.env.NODE_ENV ? process.env.NODE_ENV : "";
		return new Discord.MessageEmbed(embed).setFooter(
			embed.footer?.text + `\nUsing ${name} v${version} ${environment}`,
			// embed.footer?.text + `\n${name} ${version} ${environment}`,
			embed.footer?.iconURL
		);
	}
}
