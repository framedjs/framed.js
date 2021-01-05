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
	static importScripts(options: Options): unknown[] {
		const scripts: unknown[] = [];

		// Sanity check
		if (!existsSync(options.dirname)) return scripts;

		const requiredScripts: {
			[key: number]: { key: number; value: { default: unknown } };
		} = RequireAll(options);
		logger.silly(`requiredScripts: ${util.inspect(requiredScripts)}`);

		const requiredScriptsValues = Object.values(requiredScripts);
		logger.silly(
			`requiredScriptsValues: ${util.inspect(requiredScriptsValues)}`
		);

		for (const key in requiredScriptsValues) {
			const pluginScript = requiredScriptsValues[key];
			logger.silly(`Key: ${key} | ${util.inspect(pluginScript)}`);

			const values = Object.values(pluginScript);
			for (const key in values) {
				logger.silly(`Key: ${key}`);

				let exports = values[key];

				// For some reason, TypeScript thinks this value can be a number
				if (typeof exports == "object") {
					if (typeof exports.default === "function") {
						logger.silly("Exported default is a function");
						exports = exports.default;
					}
				}

				scripts.push(exports);
			}
		}

		logger.silly(`Scripts: ${util.inspect(scripts)}`);

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
			throw new InvalidError({
				name: "Message Link",
				input: args[0],
				extraMessage: "The message link cannot be from another server!",
			});
		}

		const channel = client.channels.cache.get(args[1]) as
			| Discord.TextChannel
			| Discord.NewsChannel
			| Discord.DMChannel;
		if (!channel) {
			throw new NotFoundError({
				input: args[1],
				name: "Channel",
				extraMessage: `I couldn't find the channel from the message link!`,
			});
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

	/**
	 * Fetch timeout for getting all guild members in a server
	 */
	static fetchTimeout = 3000;

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
	 * Resolves a Discord.UserResolvable, username, or tag into a Discord.User.
	 * This function doesn't account for non-cached members.
	 *
	 * @param user Discord.UserResolvable, username, or tag
	 * @param users Discord users
	 *
	 * @returns Discord user or undefined
	 */
	static resolveUser(
		user: Discord.UserResolvable | string,
		users: Discord.UserManager
	): Discord.User | undefined {
		const id = DiscordUtils.resolveUserId(user, users);
		if (id) {
			return users.cache.get(id);
		}
	}

	/**
	 * Resolves a Discord.UserResolvable, username, or tag into a Discord.User.
	 * This function accounts for non-cached users, but will throw an error
	 * if it tries to fetch, and fails.
	 *
	 * @param user Discord.UserResolvable, username, or tag (username#0000)
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
	 * Resolves a Discord.UserResolvable, username, or tag into a user ID.
	 * This function doesn't account for non-cached users.
	 *
	 * @param user Discord.UserResolvable, username, or tag
	 * @param users Discord users
	 *
	 * @returns Discord user ID or undefined
	 */
	static resolveUserId(
		user: Discord.UserResolvable | string,
		users: Discord.UserManager
	): string | undefined {
		let newUserId: string | undefined = users.resolve(user)?.id;

		if (!newUserId && typeof user == "string") {
			// If the resolve didn't work...

			// ...try to parse out a mention
			let userId = DiscordUtils.getIdFromMention(user);

			// ...try to get it by their tag (username#0000) or username
			if (!userId) {
				userId = users.cache.find(
					newUser => newUser.tag == user || newUser.username == user
				)?.id;
			}

			// If it was found, set that as the new user ID
			if (userId) {
				newUserId = userId;
			}
		}

		// Returns the user if it's not null or undefined
		if (newUserId) {
			return newUserId;
		} else {
			return undefined;
		}
	}

	/**
	 * Resolves a Discord.UserResolvable, username, or tag into a user ID.
	 * This function accounts for non-cached users, but will throw an error
	 * if it tries to fetch the member, and fails.
	 *
	 * @param user Discord.UserResolvable, username, or tag
	 * @param users Discord users
	 *
	 * @returns Discord user ID or undefined
	 */
	static async resolveUserIdFetch(
		user: Discord.UserResolvable | string,
		users: Discord.UserManager
	): Promise<string | undefined> {
		const userId = DiscordUtils.resolveUserId(user, users);

		if (!userId && typeof user == "string") {
			return (await DiscordUtils.resolveUserFetch(user, users))?.id;
		}

		return userId;
	}

	//#endregion

	//#region GuildMembers

	/**
	 * Resolves a Discord.UserResolvable, username, tag (username#0000), or nickname to a Discord.GuildMember.
	 * This function doesn't account for non-cached members.
	 *
	 * @param user Discord.UserResolvable, username, tag (username#0000), or nickname
	 * @param members Discord guild members
	 *
	 * @returns Discord guild member or undefined
	 */
	static resolveMember(
		user: Discord.UserResolvable | string,
		members: Discord.GuildMemberManager
	): Discord.GuildMember | undefined {
		const id = DiscordUtils.resolveMemberId(user, members);
		if (id) {
			return members.cache.get(id);
		}
	}

	/**
	 * Resolves a Discord.UserResolvable, username, tag (username#0000), or nickname to a Discord.GuildMember.
	 * This function accounts for non-cached members, but will throw an error
	 * if it tries to fetch, and fails.
	 *
	 * @param user Discord.UserResolvable, username, tag (username#0000), or nickname
	 * @param members Discord guild members
	 *
	 * @returns Discord guild member or undefined
	 */
	static async resolveMemberFetch(
		user: Discord.UserResolvable | string,
		members: Discord.GuildMemberManager
	): Promise<Discord.GuildMember | undefined> {
		const newMember = DiscordUtils.resolveMember(user, members);

		// If it's still not found, fetch the user, and try again
		if (!newMember) {
			const longTask = members.fetch(user);
			const timeout = Utils.sleep(DiscordUtils.fetchTimeout);

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
	 * Resolves a Discord.UserResolvable, username, or tag into a user ID.
	 * This function doesn't account for non-cached members.
	 *
	 * @param user Discord.UserResolvable, username, or tag
	 * @param members Discord Guild members
	 *
	 * @returns Discord user ID or undefined
	 */
	static resolveMemberId(
		user: Discord.UserResolvable | string,
		members: Discord.GuildMemberManager
	): string | undefined {
		let newMemberId: string | undefined = members.resolve(user)?.id;

		if (!newMemberId && typeof user == "string") {
			// If the resolve didn't work...

			// ...try to parse out a mention
			newMemberId = DiscordUtils.getIdFromMention(user);

			// ...try to get it by their tag (username#0000), username, or nickname
			if (!newMemberId) {
				newMemberId = members.cache.find(
					member =>
						member.user.tag == user ||
						member.nickname == user ||
						member.user.username == user
				)?.id;
			}
		}

		// Returns the member if it's not null or undefined
		if (newMemberId) {
			return newMemberId;
		} else {
			return undefined;
		}
	}

	/**
	 * Resolves a Discord.UserResolvable, username, or tag into a user ID.
	 * This function accounts for non-cached members.
	 *
	 * @param user Discord.UserResolvable, username, or tag
	 * @param members Discord users
	 *
	 * @returns Discord user ID or undefined
	 */
	static async resolveMemberIdFetch(
		user: Discord.UserResolvable | string,
		members: Discord.GuildMemberManager
	): Promise<string | undefined> {
		const memberId = DiscordUtils.resolveMemberId(user, members);

		// If it's still not found, fetch everything, and try again
		if (!memberId) {
			const longTask = members.fetch(user);
			const timeout = Utils.sleep(DiscordUtils.fetchTimeout);

			const results = await Promise.race([longTask, timeout]);
			if (results instanceof Discord.Collection) {
				return DiscordUtils.resolveMemberId(user, members);
			} else {
				throw new Error(
					`Members fetch timed out! This is likely an Intents issue.`
				);
			}
		}

		return memberId;
	}

	//#endregion

	//#region Roles

	/**
	 * Resolves a Discord.RoleResolvable into a Discord.Role, with added searching functionality.
	 * This function doesn't account for non-cached members.
	 *
	 * @param role Discord.RoleResolvable or name
	 * @param roles Discord Roles
	 *
	 * @returns Discord.Role or undefined
	 */
	static resolveRole(
		role: Discord.RoleResolvable | string,
		roles: Discord.RoleManager
	): Discord.Role | undefined {
		const id = DiscordUtils.resolveRoleId(role, roles);
		if (id) {
			return roles.cache.get(id);
		}
	}

	/**
	 * Resolves a Discord.UserResolvable to a Discord.GuildMember.
	 * This function accounts for non-cached members, but will throw an error
	 * if it tries to fetch, and fails.
	 *
	 * @param role Discord.RoleResolvable or name
	 * @param roles Discord Roles
	 *
	 * @returns Discord.Role or or undefined
	 */
	static async resolveRoleFetch(
		role: Discord.RoleResolvable | string,
		roles: Discord.RoleManager
	): Promise<Discord.Role | undefined> {
		const newMember = DiscordUtils.resolveRole(role, roles);

		// If it's still not found, fetch everything, and try again
		if (!newMember) {
			const longTask = roles.fetch();
			const timeout = Utils.sleep(DiscordUtils.fetchTimeout);

			const results = await Promise.race([longTask, timeout]);
			if (results instanceof Discord.Collection) {
				return DiscordUtils.resolveRole(role, roles);
			} else {
				throw new Error(
					`Members fetch timed out! This is likely an Intents issue.`
				);
			}
		}

		return newMember;
	}

	/**
	 * Resolves a Discord.RoleResolvable, username, or tag into a user ID.
	 * This function doesn't account for non-cached members.
	 *
	 * @param role Discord.RoleResolvable or name
	 * @param roles Discord Roles
	 *
	 * @returns Discord.Role or or undefined
	 */
	static resolveRoleId(
		role: Discord.RoleResolvable | string,
		roles: Discord.RoleManager
	): string | undefined {
		let newRoleId: string | undefined = roles.resolve(role)?.id;

		if (!newRoleId && typeof role == "string") {
			// If the resolve didn't work...

			// ...try to parse out a mention
			newRoleId = DiscordUtils.getIdFromMention(role);

			// ...try to get it by their tag (username#0000), username, or nickname
			if (!newRoleId) {
				newRoleId = roles.cache.find(newRole => newRole.name == role)
					?.id;
			}
		}

		// Returns the member if it's not null or undefined
		if (newRoleId) {
			return newRoleId;
		} else {
			return undefined;
		}
	}

	/**
	 * Resolves a Discord.UserResolvable, username, or tag into a user ID.
	 * This function accounts for non-cached members.
	 *
	 * @param role Discord.RoleResolvable or name
	 * @param roles Discord Roles
	 *
	 * @returns Discord.Role or or undefined
	 */
	static async resolveRoleIdFetch(
		role: Discord.RoleResolvable | string,
		roles: Discord.RoleManager
	): Promise<string | undefined> {
		const roleId = DiscordUtils.resolveRoleId(role, roles);

		// If it's still not found, fetch everything, and try again
		if (!roleId) {
			await roles.fetch();
			return DiscordUtils.resolveRoleId(role, roles);
		}

		return roleId;
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
