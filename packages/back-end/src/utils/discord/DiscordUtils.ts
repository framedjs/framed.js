import Discord from "discord.js";
import { logger } from "shared";
import util from "util";
import RequireAll from "require-all";
import Options from "../../interfaces/RequireAllOptions";

export default class DiscordUtils {
	/**
	 * Imports scripts from a path, gets all the default exports, then puts it into an array
	 * @param options RequireAll Options
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	/* eslint-disable @typescript-eslint/no-explicit-any */
	static importScripts(options: Options): any[] {
		// I have no idea how the hell this code is supposed to work in TypeScript

		const requiredScripts: {
			[key: number]: { key: number; value: { default: any } };
		} = RequireAll(options);
		logger.debug(`requiredScripts: ${util.inspect(requiredScripts)}`);
		const scripts: any[] = [];

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
			throw new Error("User ID was invalid!");
		}
	}

	/**
	 * Get member from a user's message
	 * @param msg Discord Message
	 */
	static getMemberFromUserMsg(
		msg: Discord.Message
	): Discord.GuildMember | undefined {
		let member;
		if (msg.member) {
			member = msg.member;
		} else {
			if (process.env.FALLBACK_GUILD_ID) {
				const guild = msg.client.guilds.cache.get(
					process.env.FALLBACK_GUILD_ID
				);
				if (guild?.available) {
					const tempMember = guild.members.cache.get(msg.author.id);
					if (tempMember) {
						member = tempMember;
					}
				}
			}
		}

		return member;
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
