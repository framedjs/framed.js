import Discord from "discord.js";
import { logger, Utils } from "shared";
import util from "util";
import RequireAll from "require-all";
import Options from "../../interfaces/RequireAllOptions";
import { existsSync } from "fs";
import { NotFoundError } from "../../structures/errors/NotFoundError";
import { InvalidError } from "../../structures/errors/InvalidError";
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
	 *
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
	 * Gets a Discord message object from a link.
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

	//#region Resolver Functions

	//#region Channels

	/**
	 * Resolves a DiscordChannelResolvable into a Discord channel.
	 *
	 * @param channel DiscordChannelResolvable
	 * @param channels Discord Channel Manager
	 *
	 * @returns Discord channel, or undefined
	 */
	static resolveChannel(
		channel: Discord.ChannelResolvable,
		channels: Discord.ChannelManager
	): Discord.Channel | undefined {
		let newChannel: Discord.Channel | null | undefined = channels.resolve(
			channel
		);

		if (!newChannel && typeof channel == "string") {
			// If the resolve didn't work...

			// ...try to parse out a mention
			const newChannelId = DiscordUtils.getIdFromMention(channel);
			if (newChannelId) {
				newChannel = channels.resolve(newChannelId);
			}
		}

		if (!newChannel) {
			// Gets name
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
	 * Resolves a DiscordGuildChannelResolvable into a Discord channel.
	 *
	 * @param channel DiscordGuildChannelResolvable
	 * @param channels Discord Guild Channel Manager
	 *
	 * @returns Discord guild channel, or undefined
	 */
	static resolveGuildChannel(
		channel: Discord.GuildChannelResolvable | string,
		channels: Discord.GuildChannelManager
	): Discord.GuildChannel | undefined {
		let newChannel:
			| Discord.GuildChannel
			| null
			| undefined = channels.resolve(channel);

		if (!newChannel && typeof channel == "string") {
			// If the resolve didn't work...

			// ...try to parse out a mention
			const newChannelId = DiscordUtils.getIdFromMention(channel);
			if (newChannelId) {
				newChannel = channels.resolve(newChannelId);
			}
		}

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

	//#endregion

	//#region Users

	/**
	 * Resolves a Discord UserResolvable, username, or tag into a Discord.User.
	 * This function doesn't account for non-cached members.
	 *
	 * @param user Discord UserResolvable, username, or tag
	 * @param users Discord users
	 *
	 * @returns Discord user or undefined
	 */
	static resolveUser(
		user: Discord.UserResolvable | string,
		users: Discord.UserManager
	): Discord.User | undefined {
		const id = DiscordUtils.resolveUserID(user, users);
		if (id) {
			return users.cache.get(id);
		}
	}

	/**
	 * Resolves a Discord UserResolvable, username, or tag into a Discord.User.
	 * This function accounts for non-cached users, but will throw an error
	 * if it tries to fetch, and fails.
	 *
	 * @param user Discord UserResolvable, username, or tag (username#0000)
	 * @param users Discord users
	 *
	 * @returns Discord user or undefined
	 */
	static async resolveUserFetch(
		user: Discord.UserResolvable | string,
		users: Discord.UserManager
	): Promise<Discord.User | undefined> {
		const newUser = DiscordUtils.resolveUser(user, users);
		if (!newUser) {
			if (!Number.isNaN(user) && typeof user == "string") {
				return users.fetch(user);
			}
		}
		return newUser;
	}

	/**
	 * Resolves a Discord UserResolvable, username, or tag into a user ID.
	 * This function doesn't account for non-cached users.
	 *
	 * @param user Discord UserResolvable, username, or tag
	 * @param users Discord users
	 *
	 * @returns Discord user ID or undefined
	 */
	static resolveUserID(
		user: Discord.UserResolvable | string,
		users: Discord.UserManager
	): string | undefined {
		let newUserID: string | undefined = users.resolve(user)?.id;

		if (!newUserID && typeof user == "string") {
			// If the resolve didn't work...

			// ...try to parse out a mention
			let userId = DiscordUtils.getIdFromMention(user);

			// ...try to get it by their tag (username#0000)
			if (!userId) {
				userId = users.cache.find(newUser => newUser.tag == user)?.id;
			}

			// ...try to get it by their username
			if (!userId) {
				userId = users.cache.find(newUser => newUser.username == user)
					?.id;
			}

			// If it was found, set that as the new user ID
			if (userId) {
				newUserID = userId;
			}
		}

		// Returns the user if it's not null or undefined
		if (newUserID) {
			return newUserID;
		} else {
			return undefined;
		}
	}

	/**
	 * Resolves a Discord UserResolvable, username, or tag into a user ID.
	 * This function accounts for non-cached users, but will throw an error
	 * if it tries to fetch the member, and fails.
	 *
	 * @param user Discord UserResolvable, username, or tag
	 * @param users Discord users
	 *
	 * @returns Discord user ID or undefined
	 */
	static async resolveUserIDFetch(
		user: Discord.UserResolvable | string,
		users: Discord.UserManager
	): Promise<string | undefined> {
		const userId = DiscordUtils.resolveUserID(user, users);

		if (!userId && typeof user == "string") {
			return (await DiscordUtils.resolveUserFetch(user, users))?.id;
		}

		return userId;
	}

	//#endregion

	//#region GuildMembers

	/**
	 * Resolves a Discord UserResolvable to a Discord.GuildMember.
	 * This function doesn't account for non-cached members.
	 *
	 * @param user Discord UserResolvable, username, tag (username#0000), or nickname
	 * @param members Discord guild members
	 *
	 * @returns Discord guild member or undefined
	 */
	static resolveMember(
		user: Discord.UserResolvable | string,
		members: Discord.GuildMemberManager
	): Discord.GuildMember | undefined {
		const id = DiscordUtils.resolveMemberID(user, members);
		if (id) {
			return members.cache.get(id);
		}
	}

	/**
	 * Resolves a Discord UserResolvable to a Discord.GuildMember.
	 * This function accounts for non-cached members, but will throw an error
	 * if it tries to fetch, and fails.
	 *
	 * @param user Discord UserResolvable, username, tag (username#0000), or nickname
	 * @param members Discord guild members
	 *
	 * @returns Discord guild member or undefined
	 */
	static async resolveMemberFetch(
		user: Discord.UserResolvable | string,
		members: Discord.GuildMemberManager
	): Promise<Discord.GuildMember | undefined> {
		const newMember = DiscordUtils.resolveMember(user, members);

		// If it's still not found, fetch everything, and try again
		if (!newMember) {
			const longTask = members.fetch();
			const timeout = Utils.sleep(3000);

			const results = await Promise.race([longTask, timeout]);
			if (results instanceof Discord.Collection) {
				return DiscordUtils.resolveMember(user, members);
			} else {
				throw new Error(
					`Members fetch timed out! This is likely an Intents issue.`
				);
			}
		}

		return newMember;
	}

	/**
	 * Resolves a Discord UserResolvable, username, or tag into a user ID.
	 * This function doesn't account for non-cached members.
	 *
	 * @param user Discord UserResolvable, username, or tag
	 * @param members Discord Guild members
	 *
	 * @returns Discord user ID or undefined
	 */
	static resolveMemberID(
		user: Discord.UserResolvable | string,
		members: Discord.GuildMemberManager
	): string | undefined {
		let newMemberID: string | undefined = members.resolve(user)?.id;

		if (!newMemberID && typeof user == "string") {
			// If the resolve didn't work...

			// ...try to parse out a mention
			newMemberID = DiscordUtils.getIdFromMention(user);

			// ...try to get it by their tag (username#0000)
			if (!newMemberID) {
				newMemberID = members.cache.find(
					member => member.user.tag == user
				)?.id;
			}

			// ...try to get it by their username
			if (!newMemberID) {
				newMemberID = members.cache.find(
					member => member.user.username == user
				)?.id;
			}

			// ...try to get it by their nickname
			if (!newMemberID) {
				newMemberID = members.cache.find(
					member => member.nickname == user
				)?.id;
			}
		}

		// Returns the member if it's not null or undefined
		if (newMemberID) {
			return newMemberID;
		} else {
			return undefined;
		}
	}

	/**
	 * Resolves a Discord UserResolvable, username, or tag into a user ID.
	 * This function accounts for non-cached members.
	 *
	 * @param user Discord UserResolvable, username, or tag
	 * @param members Discord users
	 *
	 * @returns Discord user ID or undefined
	 */
	static async resolveMemberIDFetch(
		user: Discord.UserResolvable | string,
		members: Discord.GuildMemberManager
	): Promise<string | undefined> {
		const memberId = DiscordUtils.resolveMemberID(user, members);

		// If it's still not found, fetch everything, and try again
		if (!memberId) {
			await members.fetch();
			return DiscordUtils.resolveMemberID(user, members);
		}

		return memberId;
	}

	//#endregion

	//#region Related Utils

	/**
	 * Gets the ID from the mention
	 *
	 * @param argument Discord Mention string
	 *
	 * @returns ID
	 */
	static getIdFromMention(argument: string): string | undefined {
		// Parses out a mention
		if (
			(argument.startsWith("<@") || argument.startsWith("<#")) &&
			argument.endsWith(">")
		) {
			argument = argument.slice(2, -1);

			if (argument.startsWith("!") || argument.startsWith("&")) {
				argument = argument.slice(1);
			}
			return argument;
		}
	}

	/**
	 * Gets the discriminator from a Discord tag
	 *
	 * @param argument Text to see if it has a discriminator
	 *
	 * @returns Discriminator or undefined
	 */
	static getDiscriminator(argument: string): string | undefined {
		const discriminator = argument.split("#")[1];
		if (
			discriminator &&
			!Number.isNaN(discriminator) &&
			discriminator.length == 4
		) {
			return discriminator;
		}
	}

	//#endregion

	//#endregion
}
