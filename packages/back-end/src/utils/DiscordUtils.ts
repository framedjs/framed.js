import Discord from "discord.js";
import { logger } from "shared";
import util from "util";
import RequireAll from "require-all";

// Same as index.d.ts for require-all, just too lazy to contribute to the
// DefinitelyTyped repo to export this interface, then wait
export interface Options {
	dirname: string;
	filter?:
		| ((name: string, path: string) => string | false | undefined)
		| RegExp;
	excludeDirs?: RegExp;
	map?: (name: string, path: string) => string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	resolve?: (module: any) => any;
	recursive?: true | false;
}

/**
 * Imports scripts from a path, gets all the default exports, then puts it into an array
 * @param options RequireAll Options
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
/* eslint-disable @typescript-eslint/no-explicit-any */
export function importScripts(options: Options): any[] {
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

//#region Embed functions

/**
 * Gets a color for generating embeds
 * @param msg - Discord message object
 */
export function getEmbedColorWithFallback(msg: Discord.Message): string {
	const client = msg.client;

	// Sets a bot color
	let botColor = "";

	if (client.user) {
		if (msg.guild?.available) {
			// Grabs the primary role's color the bot has
			const member = msg.guild.members.cache.get(client.user.id);
			if (member) {
				botColor = member.displayHexColor;
				logger.debug(`botColor: ${botColor}`);

				if (process.env.FALLBACK_COLOR && botColor == "#000000") {
					botColor = process.env.FALLBACK_COLOR;
				}
			} else {
				logger.warn(`Unable to find member of self on guild??`);
			}
		}

		// If the guild isn't availiable (or in DMs), we fallback to a preset color
		if (botColor == "") {
			if (process.env.FALLBACK_COLOR)
				botColor = process.env.FALLBACK_COLOR;
			else return "#000000";
		}
	}

	return botColor;
}

/**
 * Applies a Discord embed template that should (hopefully) be a consistent design language.
 * @param msg - Discord message to get the appropiate color and avatar
 * @param commandUsed - Command used (as its full form) to be removed from a list
 * @param commands - All possible commands
 * @param embed - Embed to base the changes off of
 */
export function applyEmbedTemplate(
	msg: Discord.Message,
	commandUsed?: string,
	commands?: Array<string>,
	embed?: Discord.MessageEmbed
): Discord.MessageEmbed {
	return new Discord.MessageEmbed(embed)
		.setAuthor(
			msg.client.user?.username,
			msg.client.user?.displayAvatarURL({ dynamic: true })
		)
		.setColor(getEmbedColorWithFallback(msg))
		.setFooter(
			getCheckOutText(commandUsed, commands),
			msg.author.displayAvatarURL({ dynamic: true })
		);
}

/**
 * Related to applyEmbedTemplate()
 * @param commandUsed - Command used
 * @param commands - Command list
 */
function getCheckOutText(commandUsed?: string, commands?: Array<string>) {
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
export function applyVersionInFooter(
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

/**
 * Returns the embed warning text, or returns an empty string. Depends on user data.
 * @param id - Discord user ID
 */
// export async function getEmbedWarningText(id: string) {
// 	const embedWarningMsg =
// 		"*If you don't see some info, make sure link previews are enabled in User Settings!\n" +
// 		"If you'd like to remove this warning, use the command `.understand`.*";
// 	// + "User Settings -> Text and Images -> Link Preview -> Show Website preview info from links pasted into chat"
// 	const userRepo = TypeORM.getRepository(User);
// 	let user = await userRepo.findOne(id);
// 	if (user) {
// 		if (user.userData?.disableEmbedWarning) {
// 			return "";
// 		} else {
// 			return embedWarningMsg;
// 		}
// 	} else {
// 		throw new Error("User wasn't found in the database");
// 	}
// }

//#endregion

//#endregion

/**
 * Gets the user's display name on a guild. Contains a fallback to the user's username.
 * @param msg - Discord Message
 * @param userId - Discord User ID
 */
export function getDisplayNameWithFallback(
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
export function getMemberFromUserMsg(
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

// interface CodeBlockTable {
// 	rows: CodeBlockRow[];
// }

// interface CodeBlockRow {
// 	columns: string[];
// }

// export function createCodeBlockTable(rows: CodeBlockRow[]): CodeBlockTable {
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

// export function renderCodeBlockTable(table: CodeBlockTable): string {
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
