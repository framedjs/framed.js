import Discord from "discord.js";
import { logger } from "shared";
import { FramedMessageDiscordData } from "../../interfaces/FramedMessageDiscordData";
import FramedClient from "../../structures/FramedClient";

/**
 * Discord Embed helper function class
 */
export default class EmbedHelper {
	/**
	 * Gets a color for generating embeds
	 * @param guild - Discord message object
	 */
	static getEmbedColorWithFallback(
		guild: Discord.Guild | null | undefined,
		defaultColor = "#000000"
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
	 * Applies a Discord embed template that should (hopefully) be a consistent design language.
	 * @param msg FramedMessage object or Discord message
	 * @param framedClient Framed client
	 * @param commandUsed Command used (as its full form) to be removed from a list
	 * @param embed Embed to base the changes off of
	 * @param commands All possible commands
	 */
	/* eslint-disable no-mixed-spaces-and-tabs */
	static applyEmbedTemplate(
		msg: Discord.Message | FramedMessageDiscordData,
		framedClient: FramedClient,
		commandUsed?: string,
		embed?: Discord.MessageEmbed,
		commands?: Array<string>
	): Discord.MessageEmbed {
		return new Discord.MessageEmbed(embed)
			.setAuthor(
				msg.client.user?.username,
				msg.client.user?.displayAvatarURL({ dynamic: true })
			)
			.setColor(EmbedHelper.getEmbedColorWithFallback(msg.guild))
			.setFooter(
				EmbedHelper.getCheckOutText(
					commandUsed,
					commands ? commands : framedClient.helpCommands
				),
				msg.author.displayAvatarURL({ dynamic: true })
			);
	}
	/* eslint-enable no-mixed-spaces-and-tabs */

	/**
	 * Related to applyEmbedTemplate()
	 * @param commandUsed - Command used
	 * @param commands - Command list
	 */
	static getCheckOutText(
		commandUsed?: string,
		commands?: Array<string>
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
			if (!process.env.PREFIX) process.env.PREFIX = ".";
			output += `${process.env.PREFIX}${element}`;

			// If it's not the last one
			if (i != clonedArray.length - 1) {
				output += " | ";
				// output += "  ";
			} else {
				logger.debug(`last one`);
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
