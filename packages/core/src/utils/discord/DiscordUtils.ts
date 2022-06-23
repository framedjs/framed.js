/* eslint-disable no-mixed-spaces-and-tabs */
import Axios from "axios";
import Discord from "discord.js";
import { oneLine, stripIndents } from "common-tags";

import { Utils } from "@framedjs/shared";
import { Logger } from "@framedjs/logger";

import { BaseMessage } from "../../structures/BaseMessage";
import { Client } from "../../structures/Client";
import { DiscordInteraction } from "../../structures/DiscordInteraction";
import { DiscordMessage } from "../../structures/DiscordMessage";
import { FriendlyError } from "../../structures/errors/FriendlyError";
import { InternalError } from "../../structures/errors/InternalError";
import { InvalidError } from "../../structures/errors/InvalidError";
import { NotFoundError } from "../../structures/errors/NotFoundError";

import type {
	DiscohookMessageData,
	DiscohookOutputData,
} from "../../interfaces/other/DiscohookOutputData";
import type { BaseDiscordMenuFlowPageRenderOptions } from "../../interfaces/BaseDiscordMenuFlowPageRenderOptions";
import type { Place } from "../../interfaces/Place";

export class DiscordUtils {
	/**
	 * Gets the user's display name on a guild. Contains a fallback to the user's username.
	 *
	 * @param msg - Discord Message
	 * @param userId - Discord User ID
	 * @deprecated Use getDisplayName instead.
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

	static async getDisplayName(
		user: Discord.User,
		guild?: Discord.Guild | null
	): Promise<string> {
		// Gets the member's nickname
		if (guild && guild.available) {
			const member = await guild.members.fetch({
				user: user.id,
			});
			if (member) return member.displayName;
		}
		return user.username;
	}

	static async getMessageFromId(
		id: string,
		channel: Discord.TextBasedChannel
	): Promise<Discord.Message | undefined> {
		const messages = await channel.messages.fetch({
			around: id,
			limit: 3,
		});
		for (const [, message] of messages) {
			if (message.id == id) {
				return message;
			}
		}
	}

	/**
	 * Gets a Discord message object from a link.
	 *
	 * @param link Message link
	 * @param client Discord client
	 * @param guildChannelOrAuthor Discord guild, channel, or author
	 * @param author Discord message author, for allowing a bypass of
	 * the message link being from a anotehr server.
	 *
	 * @returns Discord message or an error message string
	 * @deprecated Use DiscordUtils.getMessage() instead.
	 */
	static async getMessageFromLink(
		link: string,
		client: Discord.Client,
		guildChannelOrAuthor:
			| Discord.Guild
			| Discord.TextBasedChannel
			| Discord.User,
		author?: Discord.User
	): Promise<Discord.Message | undefined> {
		try {
			throw new Error("DiscordUtils.getMessageFromLink() is deprecated!");
		} catch (error) {
			Logger.warn((error as Error).stack);
		}

		if (
			guildChannelOrAuthor instanceof Discord.Channel &&
			/^\d+$/.test(link)
		) {
			const channel = guildChannelOrAuthor;
			return this.getMessageFromId(link, channel);
		}

		// If it's not an actual link, return undefined
		if (!link.includes(".com")) {
			return undefined;
		}

		const args = link
			.replace(/.*(discord|discordapp).com\/channels\//g, "")
			.split("/");

		if (args.length != 3) {
			throw new InvalidError({
				name: "Message Link",
				input: link,
			});
		}

		// If user is the bot owner, they may bypass this restriction
		let bypass = false;
		if (author) {
			const botOwners = process.env.BOT_OWNERS?.split(",");
			if (botOwners?.includes(author.id)) {
				bypass = true;
			}
		}

		if (!bypass && guildChannelOrAuthor instanceof Discord.Guild) {
			if (guildChannelOrAuthor.id != args[0]) {
				throw new InvalidError({
					name: "Message Link",
					input: link,
					extraMessage:
						"The message link cannot be from another server!",
				});
			}
		}

		let channel: Discord.AnyChannel | null;
		try {
			if (guildChannelOrAuthor instanceof Discord.User) {
				channel =
					guildChannelOrAuthor.dmChannel ??
					(await guildChannelOrAuthor.createDM());
			} else {
				channel = await client.channels.fetch(args[1]);
			}
		} catch (error) {
			const err = error as Error;
			if (err.message == "Missing Access") {
				throw new NotFoundError({
					input: link,
					name: "Message",
					extraMessage: "I can't access this!",
				});
			}
			throw error;
		}

		if (!channel) {
			throw new NotFoundError({
				input: link,
				name: "Channel",
				extraMessage: `I couldn't find the channel from the message link!`,
			});
		}

		if (!channel.isText()) {
			throw new InvalidError({
				input: link,
				name: "Channel",
				extraMessage:
					"The channel within the link isn't a text channel.",
			});
		}

		try {
			const message = await channel.messages.fetch(args[2]);
			return message;
		} catch (error) {
			throw new NotFoundError({
				input: args[2],
				name: "Message",
			});
		}
	}

	/**
	 *
	 * @param msg
	 * @param options
	 * @returns
	 */
	static async getMessageFromBaseMessage(
		msg: DiscordMessage | DiscordInteraction,
		options?: BaseDiscordMenuFlowPageRenderOptions & {
			useMessageHistory?: boolean;
			scanMessage?(): Promise<Discord.Message | undefined>;
		}
	): Promise<{
		message: Discord.Message | undefined;
		usedMessageHistory: boolean;
	}> {
		if (!options?.scanMessage) {
			if (!options) options = {};
			options.scanMessage = async () => {
				const messages = await msg.discord.channel.messages.fetch({
					before: msg.discord.msg?.id,
					limit: 10,
				});
				for (const [, message] of messages) {
					if (message.content != msg.content) {
						return message;
					}
				}
				return undefined;
			};
		}

		let discordMsg: Discord.Message | undefined;
		let usedMessageHistory = false;

		if (msg instanceof DiscordInteraction) {
			const interaction = msg.discordInteraction.interaction;
			if (interaction.isContextMenu()) {
				const newMessage = interaction.options.getMessage(
					"message",
					true
				);
				if (!(newMessage instanceof Discord.Message)) {
					throw new InternalError(
						`newMessage was not of type Discord.Message`
					);
				}
				discordMsg = newMessage;
			} else if (interaction.isSelectMenu() || interaction.isButton()) {
				discordMsg = await this.getMessageWithRenderOptions(
					msg.discord.client,
					{
						...options,
						channelId: options?.channelId ?? msg.discord.channel.id,
					}
				);
			} else if (interaction.isCommand()) {
				const messageLinkOrId = interaction.options.getString(
					"message",
					true
				);
				discordMsg = await this.getMessageWithRenderOptions(
					msg.discord.client,
					{
						messageId: messageLinkOrId,
						channelId: msg.discord.channel.id,
					}
				);
			}
		} else {
			const messageId = msg.args ? msg.args[0] : undefined;
			try {
				discordMsg = await this.getMessageWithRenderOptions(
					msg.discord.client,
					{
						messageId: messageId,
						channelId: options?.channelId ?? msg.discord.channel.id,
					}
				);
			} catch (error) {
				if (messageId) {
					throw error;
				} else if (options?.useMessageHistory) {
					usedMessageHistory = true;
					try {
						discordMsg = await options.scanMessage();
					} catch (error) {
						Logger.error(
							`Unable to fetch messages in channel\n${
								(error as Error).stack
							}`
						);
					}
				}
			}
		}

		return {
			message: discordMsg,
			usedMessageHistory: usedMessageHistory,
		};
	}

	/**
	 *
	 * @param client
	 * @param options
	 * @returns
	 */
	static async getMessageWithRenderOptions(
		client: Discord.Client,
		options: BaseDiscordMenuFlowPageRenderOptions
	): Promise<Discord.Message> {
		let linkOrId: string | undefined;
		if (typeof options == "string") {
			linkOrId = options;
		} else {
			linkOrId = options?.messageId;
		}

		if (!linkOrId) {
			throw new InternalError(
				"The poll message wasn't found within interaction data!"
			);
		}

		let user: Discord.User | undefined;
		if (options.userId) {
			try {
				user = await client.users.fetch(options.userId);
			} catch (error) {
				Logger.warn(error);
			}

			if (!user) {
				throw new FriendlyError(
					`User with ID "${options.userId}" wasn't found! Did that user leave?`
				);
			}
		}

		let channel: Discord.AnyChannel | undefined;
		if (/^\d+$/.test(linkOrId) && options.channelId) {
			channel =
				(await client.channels.fetch(options.channelId)) ?? undefined;
			if (!channel) {
				throw new FriendlyError(
					oneLine`Channel with ID "${options.channelId}" <#${options.channelId}>
					wasn't found! Did the channel get deleted?`
				);
			}
		}

		if (channel && !channel.isText()) {
			throw new InternalError("Channel passed isn't a text channel.");
		}

		const message = await DiscordUtils.getMessage(linkOrId, {
			client: client,
			channel: channel,
			requester: user,
			guild: options.guildId,
		});

		if (!message) {
			throw new FriendlyError(`The message couldn't be found!`);
		}

		return message;
	}

	/**
	 * Gets a Discord message object from a link.
	 *
	 * @param linkOrId Message link
	 * @param client Discord client
	 * @param guildChannelOrAuthor Discord guild, channel, or author
	 * @param author Discord message author, for allowing a bypass of
	 * the message link being from a anotehr server.
	 *
	 * @returns Discord message or an error message string
	 */
	static async getMessage(
		linkOrId: string,
		options: {
			/**
			 * Required, if no client was set by any other object.
			 */
			client?: Discord.Client;
			guild?: Discord.Guild | string | null;
			channel?: Discord.TextBasedChannel;
			requester?: Discord.User;
			bypass?: boolean;
		}
	): Promise<Discord.Message | undefined> {
		async function _fetchMessage(
			channel: Discord.TextBasedChannel,
			id: string
		) {
			try {
				const message = await channel.messages.fetch(id);
				return message;
			} catch (error) {
				throw new NotFoundError({
					input: id,
					name: "Message",
				});
			}
		}

		const client =
			options.client ??
			(options.guild instanceof Discord.Guild
				? options.guild.client
				: undefined) ??
			options.channel?.client ??
			options.requester?.client;
		if (!client) {
			throw new InternalError(
				"Client object not found in DiscordUtils.getMessage() call."
			);
		}

		if (options.channel && /^\d+$/.test(linkOrId)) {
			return _fetchMessage(options.channel, linkOrId);
		}

		// If it's not an actual link, return undefined
		if (!linkOrId.includes(".com")) {
			return undefined;
		}

		const args = linkOrId
			.replace(/.*(discord|discordapp).com\/channels\//g, "")
			.split("/");

		if (args.length != 3) {
			throw new InvalidError({
				name: "Message Link",
				input: linkOrId,
			});
		}

		// If user is the bot owner, they may bypass this restriction
		let bypass = options.bypass;
		if (options.bypass == undefined && options.requester) {
			const botOwners = process.env.BOT_OWNERS?.split(",");
			if (botOwners?.includes(options.requester.id)) {
				bypass = true;
			}
		}

		if (
			!bypass &&
			options.guild &&
			(options.guild instanceof Discord.Guild
				? options.guild?.id != args[0]
				: options.guild != args[0])
		) {
			throw new InvalidError({
				name: "Message Link",
				input: linkOrId,
				extraMessage: "The message link cannot be from another server!",
			});
		}

		let channel: Discord.AnyChannel | null;
		try {
			if (args[0] == "@me" && options.requester instanceof Discord.User) {
				channel =
					options.requester.dmChannel ??
					(await options.requester.createDM());
			} else {
				channel = await client.channels.fetch(args[1]);
			}
		} catch (error) {
			const err = error as Error;
			if (err.message == "Missing Access") {
				throw new NotFoundError({
					input: linkOrId,
					name: "Message",
					extraMessage: "I can't access this!",
				});
			}
			throw error;
		}

		if (!channel) {
			throw new NotFoundError({
				input: linkOrId,
				name: "Channel",
				extraMessage: `I couldn't find the channel from the message link!`,
			});
		}

		if (!channel.isText()) {
			throw new InvalidError({
				input: linkOrId,
				name: "Channel",
				extraMessage:
					"The channel within the link isn't a text channel.",
			});
		}

		return _fetchMessage(channel, args[2]);
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
	): Discord.AnyChannel | undefined {
		let newChannel: Discord.AnyChannel | null | undefined =
			channels.resolve(channel);

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

					const parse = BaseMessage.parseEmojiAndString(
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
	 * Resolves a TextChannelResolvable into a Discord channel.
	 *
	 * @param channel TextChannelResolvable
	 * @param channels Discord Channel Manager
	 *
	 * @returns Discord channel, or undefined
	 */
	static resolveTextChannel(
		channel: Discord.TextChannelResolvable,
		channels: Discord.ChannelManager
	): Discord.TextChannel | undefined {
		let newChannel: Discord.TextChannel | null | undefined;
		const resolveChannel = channels.resolve(channel);
		if (resolveChannel instanceof Discord.TextChannel) {
			newChannel = resolveChannel;
		}

		if (!newChannel && typeof channel == "string") {
			// If the resolve didn't work...

			// ...try to parse out a mention
			const newChannelId = DiscordUtils.getIdFromMention(channel);
			if (newChannelId) {
				const resolveChannel = channels.resolve(newChannelId);
				if (resolveChannel instanceof Discord.TextChannel) {
					newChannel = resolveChannel;
				}
			}
		}

		if (!newChannel) {
			// Gets name
			const resolveChannel = channels.cache.find(cachedChannels => {
				if (cachedChannels.isText()) {
					const textChannel = cachedChannels as Discord.TextChannel;

					const parse = BaseMessage.parseEmojiAndString(
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

			if (resolveChannel instanceof Discord.TextChannel) {
				newChannel = resolveChannel;
			}
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
	): Discord.GuildChannel | Discord.ThreadChannel | undefined {
		let newChannel = channels.resolve(channel) ?? undefined;

		if (!newChannel && typeof channel == "string") {
			// If the resolve didn't work...

			// ...try to parse out a mention
			const newChannelId = DiscordUtils.getIdFromMention(channel);
			if (newChannelId) {
				newChannel = channels.resolve(newChannelId) ?? undefined;
			}
		}

		if (!newChannel) {
			newChannel = channels.cache.find(cachedChannel => {
				if (cachedChannel.isText()) {
					const parse = BaseMessage.parseEmojiAndString(
						cachedChannel.name
					);

					// Finds the name of the channel, also with
					// excluding the emotes at the beginning
					if (
						channel == cachedChannel.name ||
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
				newRoleId = roles.cache.find(
					newRole => newRole.name == role
				)?.id;
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

	/**
	 * Converts JSON or a URL into Discord message data.
	 *
	 * @param jsonOrLink Discohook JSON or a Discohook URL
	 */
	static async getOutputData(
		jsonOrLink: string,
		suppressWarnings?: boolean
	): Promise<DiscohookOutputData> {
		// http://urlregex.com/
		const regex =
			// eslint-disable-next-line no-useless-escape
			/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/g;
		const matches = jsonOrLink.matchAll(regex);

		// Embed data
		let newEmbedData;

		// Link and domain found
		let link = "";
		let domain = "";

		if (matches) {
			for (const match of matches) {
				link = match[0];
				domain = match[2];
				break;
			}
		}

		// Attempts to parse out the URL, and get base64 data from it
		// if a link that has the data needed is used
		if (
			link.length > 0 &&
			domain.length > 0 &&
			jsonOrLink.split(" ")[0].trim() == link
		) {
			const response = await Axios.get(link);
			try {
				if (response.request.path) {
					const path = response.request.path as string;
					const base64 = Buffer.from(
						path.replace("/?data=", ""),
						"base64"
					);
					const newString = base64.toString("utf-8");
					newEmbedData = JSON.parse(newString);
				} else {
					throw new Error("No request path");
				}
			} catch (error) {
				if (!suppressWarnings) Logger.warn((error as Error).stack);
				throw new FriendlyError("The link couldn't be read!");
			}
		} else {
			// The contents are JSON, and should attempt to be parsed
			try {
				newEmbedData = JSON.parse(jsonOrLink);
			} catch (error) {
				if (!suppressWarnings) Logger.warn((error as Error).stack);
				throw new FriendlyError(
					"The data couldn't be parsed into an embed!"
				);
			}
		}

		return newEmbedData;
	}

	/**
	 * Renders out Discohook Output data.
	 *
	 * If client and place are specified, formatting will be done
	 *
	 * @param newData Data
	 * @param channelOrMessage Discord channel
	 * @param options
	 */
	static async renderOutputData(
		newData: DiscohookOutputData | DiscohookMessageData,
		channelOrMessage: Discord.TextBasedChannel | Discord.Message,
		options?: {
			client?: Client;
			place?: Place;
		}
	): Promise<Discord.Message[]> {
		Logger.silly(stripIndents`newEmbedData:
		${Utils.util.inspect(newData, false, 7, true)}`);

		const newMsgs: Discord.Message[] = [];

		try {
			if ("messages" in newData) {
				for (let i = 0; i < newData.messages.length; i++) {
					const message = newData.messages[i];

					const newMsg = await this.renderMessageData(
						message.data,
						channelOrMessage,
						{
							client: options?.client,
							place: options?.place,
							shouldEdit: i == 0,
						}
					);
					if (!newMsg) {
						throw new FriendlyError(
							"There wasn't anything to render."
						);
					}
					newMsgs.push(newMsg);
				}
			} else {
				const newMsg = await this.renderMessageData(
					newData,
					channelOrMessage,
					{
						client: options?.client,
						place: options?.place,
						shouldEdit: true,
					}
				);
				if (!newMsg) {
					throw new FriendlyError("There wasn't anything to render.");
				}
				newMsgs.push(newMsg);
			}
		} catch (error) {
			if (error instanceof FriendlyError) {
				throw error;
			} else {
				Logger.error((error as Error).stack);
				throw new FriendlyError(
					"An unknown error happened while rendering. Check console logs for more info."
				);
			}
		}

		return newMsgs;
	}

	/**
	 * Renders message data.
	 *
	 * @param messageData
	 * @param channelOrMessage
	 * @param options
	 */
	static async renderMessageData(
		messageData: DiscohookMessageData,
		channelOrMessage: Discord.TextBasedChannel | Discord.Message,
		options?: {
			client?: Client;
			place?: Place;
			shouldEdit: boolean;
		}
	): Promise<Discord.Message | undefined> {
		const embeds: Discord.MessageEmbed[] = [];
		let channel: Discord.TextChannel | undefined;
		let msgToEdit: Discord.Message | undefined;
		for (
			let i = 0;
			i < (messageData.embeds ? messageData.embeds.length : 1);
			i++
		) {
			// Embed data is generated if it exists
			const embedData = messageData.embeds
				? messageData.embeds[i]
				: undefined;
			let embed = embedData
				? new Discord.MessageEmbed(
						Utils.turnUndefinedIfNull(
							embedData
						) as Discord.MessageEmbedOptions
				  )
				: undefined;

			// Format embed if it can
			if (embed && options?.client && options?.place) {
				embed = await options?.client.formatting.formatEmbed(
					embed,
					options?.place
				);
			}

			if (embed) {
				embeds.push(embed);
			}

			// Makes sure the message never gets edited again
			if (options?.shouldEdit) options.shouldEdit = false;
		}

		if (channelOrMessage instanceof Discord.Message) {
			if (options?.shouldEdit) {
				msgToEdit = channelOrMessage;
			} else {
				channel = channelOrMessage.channel as Discord.TextChannel;
			}
		} else {
			channel = channelOrMessage as Discord.TextChannel;
		}

		// Content will only be used for the first embed
		let content = Utils.turnUndefinedIfNull(messageData.content) as string;
		if (content && options?.client && options?.place) {
			content = await options.client.formatting.format(
				content,
				options.place
			);
		}

		if (!channel) {
			throw new InternalError(
				`Channel missing in \`DiscordUtils.renderMessageData()\``
			);
		}

		const messageOptions:
			| Discord.MessageOptions
			| Discord.MessageEditOptions = {
			content: content ?? undefined,
			embeds: embeds,
		};

		if (msgToEdit) {
			return msgToEdit.edit(messageOptions as Discord.MessageEditOptions);
		} else {
			return channel.send(messageOptions as Discord.MessageOptions);
		}
	}
}
