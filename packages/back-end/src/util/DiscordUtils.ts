import Discord from "discord.js";
import { logger } from "shared";

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
		embed.footer?.text + `\nRunning ${name} - v${version} ${environment}`,
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
	const guild = getMainGuild(msg);

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

//#region Generic Util

//#endregion

//#region Discord Presences

/**
 * Creates a list of Discord Presences from a list of commands
 * @param commands A list of commands as a string
 */
export function generatePresencesData(
	commands: Array<string>
): Discord.PresenceData[] {
	const precensesList: Discord.PresenceData[] = [];
	for (let i = 0; i < commands.length; i++) {
		const element = commands[i];
		precensesList.push({
			status: "online",
			activity: {
				name: `${process.env.PREFIX}${element} | ${process.env.PRESENCE_MSG}`,
				type: `PLAYING`,
			},
		});
	}
	return precensesList;
}

/**
 * Change the bot's user presence
 * @param client - Discord client
 * @param presenceData - Discord presence data
 */
export async function setPresence(
	client: Discord.Client,
	presenceData: Discord.PresenceData
): Promise<void> {
	if (client.user) {
		client.user
			.setPresence(presenceData)
			.then(presence =>
				logger.verbose(
					`Activity set to "${presence.activities[0].name}"`
				)
			);
	}
}

//#endregion

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

/**
 * Get member from user
 * @param client - Discord client
 * @param userId - User ID
 */
// export function getMemberFromUserId(client: Discord.Client, userId: string): Discord.GuildMember | undefined {
// 	let member;

// 	const guild = client.guilds.cache.get(process.env.FALLBACK_GUILD_ID!);
// 	if (guild?.available) {
// 		const tempMember = guild.members.cache.get(userId);
// 		if (tempMember) {
// 			member = tempMember;
// 		}
// 	}

// 	return member;
// }

/**
 * Returns a guild object, if it's availiable
 * @param msg - Discord Message object
 */
export function getMainGuild(msg: Discord.Message): Discord.Guild | undefined {
	// Gets a guild
	let guild = msg.guild;

	// Fallback to using the guild ID to get the guild
	if (!guild) {
		if (process.env.FALLBACK_GUILD_ID) {
			const tempGuild = msg.client.guilds.cache.get(
				process.env.FALLBACK_GUILD_ID
			);
			if (tempGuild) {
				guild = tempGuild;
			}
		}
	}

	if (guild) {
		if (guild.available) {
			return guild;
		}
	}
}

//#region Input

/**
 * Attempts to get a Discord user by user input.
 * If the code cannot find the user, it will either return undefined, or return the sender's Discord user object.
 * @param msg Discord Message object
 * @param args Arugments
 * @param argNumber - Number to try and find the user
 * @param verbose Flag to be verbose on Discord replies on failing to get messages
 */
export function getUserFromUserInput(
	msg: Discord.Message,
	args: Array<string>,
	argNumber: number,
	verbose?: boolean
): Discord.User | undefined {
	logger.debug(`${msg.content} | ${args} | ${argNumber} | ${verbose}`);
	const client = msg.client;

	// Was someone mentioned?
	let user = msg.mentions.users.first();
	if (user) return user;

	// Does parameter exist
	if (args[argNumber]) {
		// Was a potential user ID was mentioned
		if (Number(args[argNumber])) {
			const tempUser = client.users.cache.get(args[argNumber]);
			if (tempUser) {
				logger.verbose(`Found user from mention: ${tempUser.tag}`);
				return tempUser;
			} else {
				if (verbose)
					msg.reply("invalid: saw numbers but wasn't a user id");
				return;
			}
		} else {
			// Makes sure prefix and command were defined
			// if (!prefix) {
			// 	throw new Error("Need prefix now, but is undefined");
			// }

			// if (!command) {
			// 	throw new Error("Need command now, but is undefined");
			// }

			// Now, we have to account for spaces inside tags, usernames, and display names
			// arg simply gets the first part of the argument, and cuts everything from the left
			const arg = msg.content.slice(msg.content.indexOf(args[argNumber]));
			logger.debug(`arg: "${arg}"`);

			// Possibly finds tag (Case senseitive)
			let tempUser = client.users.cache.find(u => arg.includes(u.tag));
			if (tempUser) {
				logger.verbose(`Found user from tag: ${tempUser.tag}`);
				return tempUser;
			}

			// Possibly finds tag (case insensitive)
			tempUser = client.users.cache.find(u =>
				arg.toLocaleLowerCase().includes(u.tag.toLocaleLowerCase())
			);
			if (tempUser) {
				logger.verbose(`Found user from tag: ${tempUser.tag}`);
				return tempUser;
			}

			// Possibly finds by username
			tempUser = client.users.cache.find(u => arg.includes(u.username));
			if (tempUser) {
				logger.verbose(`Found user from username: ${tempUser.tag}`);
				return tempUser;
			}

			// Finds by displayName (case sensitive)
			const guild = getMainGuild(msg);
			if (guild) {
				const displayName = arg;
				let member = guild.members.cache.find(u =>
					displayName.includes(u.displayName)
				);

				if (member) {
					logger.verbose(
						`Found user from displayName: ${member.user.tag}`
					);
					return member.user;
				} else {
					// Finds by displayName (case insensitive)
					member = guild.members.cache.find(u =>
						displayName
							.toLocaleLowerCase()
							.includes(u.displayName.toLocaleLowerCase())
					);

					if (member) {
						logger.verbose(
							`Found user from displayName (case insensitive): ${member.user.tag}`
						);
						return member.user;
					} else {
						if (verbose)
							msg.reply(
								`Couldn't find user from the tag, username, or display name "${displayName}"`
							);
						return;
					}
				}
			} else {
				if (verbose) msg.reply("guild not availiable");
				return;
			}
		}
	}

	// Parameter doesn't exist, send the author
	user = msg.author;
	return user;
}

//#endregion
