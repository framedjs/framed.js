import Discord from "discord.js";
import { logger } from "shared";
import util from "util";
import RequireAll from "require-all";
import Options from "../../interfaces/RequireAllOptions";
import { existsSync } from "fs";
import { NotFoundError } from "../../structures/errors/NotFoundError";
import { InvalidError } from "../../structures/errors/InvalidError";
import { DiscordChannelResolvable } from "../../types/discord/DiscordChannelResolvable";
import { DiscordGuildChannelResolvable } from "../../types/discord/DiscordGuildChannelResolvable";
import FramedMessage from "../../structures/FramedMessage";

export default class DiscordUtils {
	/**
	 * Imports scripts from a path, gets all the default exports, then puts it into an array
	 * @param options RequireAll Options
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	/* eslint-disable @typescript-eslint/no-explicit-any */
	static importScripts(options: Options): any[] {
		// I have no idea how the hell this code is supposed to work in TypeScript

		const scripts: any[] = [];

		// Sanity check
		if (!existsSync(options.dirname)) return scripts;

		const requiredScripts: {
			[key: number]: { key: number; value: { default: any } };
		} = RequireAll(options);
		logger.debug(`requiredScripts: ${util.inspect(requiredScripts)}`);

		const requiredScriptsValues = Object.values(requiredScripts);
		logger.debug(
			`requiredScriptsValues: ${util.inspect(requiredScriptsValues)}`
		);

		for (const key in requiredScriptsValues) {
			const pluginScript = requiredScriptsValues[key];
			logger.debug(`Key: ${key} | ${util.inspect(pluginScript)}`);

			const values = Object.values(pluginScript);
			for (const key in values) {
				logger.debug(`Key: ${key}`);

				let exports = values[key];

				// For some reason, TypeScript thinks this value can be a number
				if (typeof exports == "object") {
					if (typeof exports.default === "function") {
						logger.debug("Exported default is a function");
						exports = exports.default;
					}
				}

				scripts.push(exports);
			}
		}

		// let commandsPath = "";
		// if (typeof options === "string" && !this.commandsPath)
		// 	this.commandsPath = options;
		// else if (typeof options === "object" && !this.commandsPath)
		// 	this.commandsPath = options.dirname;

		logger.debug(`Scripts: ${util.inspect(scripts)}`);

		return scripts;
	}
	/* eslint-enable @typescript-eslint/no-explicit-any */

	/**
	 * Gets the user's display name on a guild. Contains a fallback to the user's username.
	 * @param msg - Discord Message
	 * @param userId - Discord User ID
	 */
	static getDisplayNameWithFallback(
		msg: Discord.Message,
		userId?: string
	): string {
		// Auto-fill a user ID
		if (!userId) {
			userId = msg.author.id;
		}

		// Gets a guild
		const guild = msg.guild;

		// Gets the member's nickname
		if (guild) {
			if (guild.available) {
				const member = guild.members.cache.get(userId);
				if (member) return member.displayName;
			}
		}

		// If there isn't any guild availiable, we fallback to the username
		const user = msg.client.users.cache.get(userId);
		if (user) {
			return user.username;
		} else {
			throw new InvalidError({
				input: userId,
				name: "User ID",
			});
		}
	}

	/**
	 * https://discordjs.guide/miscellaneous/parsing-mention-arguments.html#implementation
	 * @param mention Message content, that contains the message
	 */
	static getUserFromMention(
		client: Discord.Client,
		mention: string
	): Discord.User | undefined {
		if (!mention) return;

		if (mention.startsWith("<@") && mention.endsWith(">")) {
			mention = mention.slice(2, -1);

			if (mention.startsWith("!")) {
				mention = mention.slice(1);
			}

			return client.users.cache.get(mention);
		}
	}

	/**
	 * Gets a Discord message object from a link
	 *
	 * @param link Message link
	 * @param client Discord client
	 * @param guild Discord guild
	 *
	 * @returns Discord message or an error message string
	 */
	static async getMessageFromLink(
		link: string,
		client: Discord.Client,
		author: Discord.User,
		guild: Discord.Guild
	): Promise<Discord.Message | undefined> {
		// If it's not an actual link, return undefined
		if (!link.includes(".com")) {
			return undefined;
		}

		const args = link
			.replace("https://", "")
			.replace("http://", "")
			.replace("discordapp.com/", "")
			.replace("discord.com/", "")
			.replace("channels/", "")
			.split("/");

		if (args.length != 3) {
			throw new InvalidError({
				name: "Message Link",
				input: args[0],
			});
		}

		if (guild.id != args[0]) {
			throw new InvalidError(
				{
					name: "Message Link",
					input: args[0],
				},
				"The message link cannot be from another server!"
			);
		}

		const channel = client.channels.cache.get(args[1]) as
			| Discord.TextChannel
			| Discord.NewsChannel
			| Discord.DMChannel;
		if (!channel) {
			throw new NotFoundError(
				{
					input: args[1],
					name: "Channel",
				},
				`I couldn't find the channel from the message link!`
			);
		}

		let message = channel.messages.cache.get(args[2]);
		if (!message) {
			try {
				message = await channel.messages.fetch(args[2]);
			} catch (error) {
				throw new NotFoundError({
					input: args[2],
					name: "Message",
				});
			}
		}

		return message;
	}

	/**
	 * Resolves a DiscordChannelResolvable into a Discord channel
	 *
	 * @param channel DiscordChannelResolvable
	 * @param channels Discord Channel Manager
	 *
	 * @returns Discord channel, or undefined
	 */
	static resolveChannel(
		channel: DiscordChannelResolvable,
		channels: Discord.ChannelManager
	): Discord.Channel | undefined {
		let newChannel: Discord.Channel | null | undefined = channels.resolve(
			channel
		);

		if (!newChannel) {
			newChannel = channels.cache.find(cachedChannels => {
				if (cachedChannels.isText()) {
					const textChannel = cachedChannels as Discord.TextChannel;

					const parse = FramedMessage.parseEmojiAndString(
						textChannel.name
					);

					// Finds the name of the channel, also with
					// excluding the emotes at the beginning
					if (
						channel == textChannel.name ||
						channel == parse?.newContent
					) {
						return true;
					}
				}
				return false;
			});
		}

		if (newChannel) {
			return newChannel;
		} else {
			return undefined;
		}
	}

	/**
	 * Resolves a DiscordGuildChannelResolvable into a Discord channel
	 *
	 * @param channel DiscordGuildChannelResolvable
	 * @param channels Discord Guild Channel Manager
	 *
	 * @returns Discord guild channel, or undefined
	 */
	static resolveGuildChannel(
		channel: DiscordGuildChannelResolvable,
		channels: Discord.GuildChannelManager
	): Discord.GuildChannel | undefined {
		let newChannel:
			| Discord.GuildChannel
			| null
			| undefined = channels.resolve(channel);

		if (!newChannel) {
			newChannel = channels.cache.find(cachedChannels => {
				if (cachedChannels.isText()) {
					const textChannel = cachedChannels as Discord.TextChannel;

					const parse = FramedMessage.parseEmojiAndString(
						textChannel.name
					);

					// Finds the name of the channel, also with
					// excluding the emotes at the beginning
					if (
						channel == textChannel.name ||
						channel == parse?.newContent
					) {
						return true;
					}
				}
				return false;
			});
		}

		if (newChannel) {
			return newChannel;
		} else {
			return undefined;
		}
	}
}

// interface CodeBlockTable {
// 	rows: CodeBlockRow[];
// }

// interface CodeBlockRow {
// 	columns: string[];
// }

// static createCodeBlockTable(rows: CodeBlockRow[]): CodeBlockTable {
// 	const newRows: CodeBlockRow[] = [];
// 	const newColumns: string[] = [];

// 	const largestColumnElementAmount = getLargestColumnElementAmount(rows)
// 		.columns.length;

// 	// Goes through all the rows
// 	for (let i = 0; i < rows.length; i++) {
// 		const row = rows[i];

// 		// Goes through all the columns
// 		for (let j = 0; j < largestColumnElementAmount; j++) {
// 			let column = row.columns[i];
// 			if (!column) column = "";
// 			newColumns.push(column);
// 		}

// 		// Gets the largest column string in length
// 		const largestColumnString = getLargestString(newColumns);
// 		const maxColumnStringLength = largestColumnString.length;

// 		// Goes through all the columns once more to add spacing
// 		for (let j = 0; j < newColumns.length; j++) {
// 			const column = row.columns[j];
// 			newColumns.push(
// 				column.padEnd(maxColumnStringLength - column.length)
// 			);
// 		}
// 	}

// 	return {
// 		rows: newRows,
// 	};
// }

// static renderCodeBlockTable(table: CodeBlockTable): string {
// 	let tableOutput = "";
// 	for (const row of table.rows) {

// 	}
// }

// /**
//  * Gets the row array that has the most column elements.
//  * @param rows
//  */
// function getLargestColumnElementAmount(rows: CodeBlockRow[]): CodeBlockRow {
// 	let largestRow: CodeBlockRow = {
// 		columns: [],
// 	};
// 	rows.forEach(element => {
// 		if (element.columns.length > largestRow.columns.length) {
// 			largestRow = element;
// 		}
// 	});

// 	return largestRow;
// }

// function getLargestString(array: string[]) {
// 	// https://stackoverflow.com/questions/52989099/finding-the-largest-string-in-an-array-of-strings
// 	const reducer = (array: string[]) =>
// 		array.reduce(
// 			(largest, comparing) =>
// 				largest.length >= comparing.length ? largest : comparing,
// 			""
// 		);
// 	return reducer(array);
// }
