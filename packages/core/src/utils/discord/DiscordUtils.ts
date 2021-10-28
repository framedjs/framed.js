/* eslint-disable no-mixed-spaces-and-tabs */
import Discord from "discord.js";
import { Utils } from "@framedjs/shared";
import { Logger } from "@framedjs/logger";
import util from "util";
import RequireAll from "require-all";
import type Options from "../../interfaces/other/RequireAllOptions";
import { existsSync } from "fs";
import { NotFoundError } from "../../structures/errors/NotFoundError";
import { InvalidError } from "../../structures/errors/InvalidError";
import { BaseMessage } from "../../structures/BaseMessage";
import { FriendlyError } from "../../structures/errors/FriendlyError";
import type {
	DiscohookMessageData,
	DiscohookOutputData,
} from "../../interfaces/other/DiscohookOutputData";
import { stripIndents } from "common-tags";
import Axios from "axios";
import { Client } from "../../structures/Client";
import type { Place } from "../../interfaces/Place";

interface RequireAllScriptData {
	[key: string]: ScriptElement;
}

interface ScriptElement {
	[key2: number]: {
		default: unknown;
	};
}

export class DiscordUtils {
	/**
	 * Imports scripts from a path, gets all the default exports, then puts it into an array
	 * @param options RequireAll Options
	 */
	static importScripts(options: Options): unknown[] {
		const scriptsList: unknown[] = [];

		// Sanity check
		if (!existsSync(options.dirname)) return scriptsList;

		const requiredScripts: RequireAllScriptData = RequireAll(options);
		Logger.silly(`requiredScripts: ${util.inspect(requiredScripts)}`);

		const requiredScriptsValues = Object.values(requiredScripts);
		Logger.silly(
			`requiredScriptsValues: ${util.inspect(requiredScriptsValues)}`
		);

		for (const key in requiredScriptsValues) {
			const script = requiredScriptsValues[key];
			Logger.silly(`Key1: ${key} | ${util.inspect(script)}`);

			// Recursively gets scripts from the object, for nested folders
			const values = Object.values(script);
			scriptsList.push(...this.recursiveGetScript(values));
		}

		Logger.silly(`Scripts: ${util.inspect(scriptsList)}`);

		return scriptsList;
	}

	/**
	 * Recursively returns an array of imported scripts
	 *
	 * @param values
	 */
	private static recursiveGetScript(values: ScriptElement): unknown[] {
		const scripts: unknown[] = [];

		for (const key in values) {
			Logger.silly(`Key2: ${key} | ${util.inspect(values)}`);

			let exports = values[key];

			// For some reason, TypeScript thinks this value can be a number
			if (typeof exports == "object") {
				if (typeof exports.default === "function") {
					Logger.silly("Exported default is a function");
					exports = exports.default;
				} else {
					scripts.push(...this.recursiveGetScript(exports));
					continue;
				}
			}

			scripts.push(exports);
		}

		return scripts;
	}

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
		guild: Discord.Guild
	): Promise<Discord.Message | undefined> {
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
		let newChannel: Discord.Channel | null | undefined =
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
		if (link.length > 0 && domain.length > 0 && jsonOrLink.trim() == link) {
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
		} else if (jsonOrLink) {
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
	 * @param client
	 * @param place
	 */
	static async renderOutputData(
		newData: DiscohookOutputData | DiscohookMessageData,
		channelOrMessage: Discord.TextBasedChannels | Discord.Message,
		client?: Client,
		place?: Place
	): Promise<Discord.Message[]> {
		Logger.silly(stripIndents`newEmbedData:
		${Utils.util.inspect(newData, false, 7, true)}`);

		const newMsgs: Discord.Message[] = [];

		try {
			if ("messages" in newData) {
				for (let i = 0; i < newData.messages.length; i++) {
					const message = newData.messages[i];

					const newMsg = await this.renderSingleMessage(
						message.data,
						channelOrMessage,
						client,
						place,
						i == 0
					);
					if (!newMsg) {
						throw new FriendlyError(
							"There wasn't anything to render."
						);
					}
					newMsgs.push(newMsg);
				}
			} else {
				const newMsg = await this.renderSingleMessage(
					newData,
					channelOrMessage,
					client,
					place,
					true
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
					"An unknown error happened while rendering"
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
	 * @param client
	 * @param place
	 */
	static async renderSingleMessage(
		messageData: DiscohookMessageData,
		channelOrMessage: Discord.TextBasedChannels | Discord.Message,
		client?: Client,
		place?: Place,
		shouldEdit = false
	): Promise<Discord.Message | undefined> {
		let msgToReturn: Discord.Message | undefined;

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
			if (embed && client && place) {
				embed = await client.formatting.formatEmbed(embed, place);
			}

			// Content will only be used for the first embed
			let content =
				i == 0
					? (Utils.turnUndefinedIfNull(messageData.content) as string)
					: undefined;
			if (content && client && place) {
				content = await client.formatting.format(content, place);
			}

			let channel: Discord.TextChannel | undefined;
			let msgToEdit: Discord.Message | undefined;
			if (channelOrMessage instanceof Discord.Message) {
				if (shouldEdit) {
					msgToEdit = channelOrMessage;
				} else {
					channel = channelOrMessage.channel as Discord.TextChannel;
				}
			} else {
				channel = channelOrMessage as Discord.TextChannel;
			}

			// Renders all the content with the retrieved data
			if (content) {
				if (embed) {
					if (channel) {
						msgToReturn = await channel.send({
							content: "",
							embeds: [embed],
						});
					} else if (msgToEdit) {
						msgToReturn = await msgToEdit.edit({
							content: "",
							embeds: [embed],
						});
					}
				} else {
					if (channel) {
						msgToReturn = await channel.send(content);
					} else if (msgToEdit) {
						msgToReturn = await msgToEdit.edit(content);
					}
				}
			} else if (embed) {
				if (channel) {
					msgToReturn = await channel.send({
						content: "",
						embeds: [embed],
					});
				} else if (msgToEdit) {
					msgToReturn = await msgToEdit.edit({
						content: "",
						embeds: [embed],
					});
				}
			}

			// Makes sure the message never gets edited again
			shouldEdit = false;
		}

		return msgToReturn;
	}
}
