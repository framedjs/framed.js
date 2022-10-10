import { oneLine } from "common-tags";
import { BaseMessage } from "./BaseMessage";
import { Utils } from "@framedjs/shared";
import { Logger } from "@framedjs/logger";
import Discord from "discord.js";
import type { DiscordMessageData } from "../interfaces/DiscordMessageData";
import type { MessageOptions } from "../interfaces/MessageOptions";
import type { UserPermissions } from "../interfaces/UserPermissions";

export class DiscordMessage extends BaseMessage {
	discord!: DiscordMessageData;

	// Forces platform to be "discord"
	platform: "discord" = "discord";

	/**
	 * Create a new Framed DiscordMessage Instance.
	 *
	 * @param options Framed Message Options
	 */
	constructor(options: MessageOptions) {
		super(options);

		this.init(options);

		// Forces this.discord to not be undefined
		if (!this.discord) {
			throw new ReferenceError(
				`this.discord is undefined, you likely only gave non-Discord data.`
			);
		}
	}

	init(options: MessageOptions): DiscordMessageData | undefined {
		// Gets the Discord Base for elements such as author, channel, etc.
		// First check for any entries in info.discord.base
		const discordBase =
			options.discord instanceof Discord.Message
				? options.discord
				: options.discord?.base ??
				  options.base?.discord ??
				  options.discord;

		if (!discordBase) return;

		this.platform = "discord";
		let channel = options.discord?.channel ?? discordBase?.channel;
		let id = discordBase?.id;

		const msg =
			discordBase instanceof Discord.Message
				? discordBase
				: id && channel
				? channel.messages.cache.get(id)
				: undefined;
		channel = channel ?? msg?.channel;
		id = id ?? msg?.id;

		const client =
			options.discord?.client ?? discordBase?.client ?? msg?.client;
		const guild =
			options.discord?.guild ?? discordBase?.guild ?? msg?.guild ?? null;
		const member =
			options.discord?.member ??
			discordBase.member ??
			msg?.member ??
			null;
		const author =
			options.discord?.author ??
			discordBase?.author ??
			msg?.author ??
			member?.user;

		// Gets client or throws error
		if (!client) {
			throw new ReferenceError(
				oneLine`Parameter discord.client wasn't set when creating Message!
					This value should be set if the discord.msg parameter hasn't been set.`
			);
		}

		// Gets channel or throws error
		if (!channel) {
			throw new ReferenceError(
				oneLine`Parameter discord.channel wasn't set when creating Message!
					This value should be set if the discord.msg parameter hasn't been set.`
			);
		}

		// Gets author or throws error
		if (!author) {
			throw new ReferenceError(
				oneLine`Parameter discord.author is undefined.`
			);
		}

		// If there's an msg object, we set all the relevant values here
		this.discord = {
			msg: msg,
			client: client,
			id: id,
			channel: channel,
			author: author,
			member: member,
			guild: guild,
		};

		// If the content string is empty, try and fill it
		if (!this.content && id) {
			const tempContent =
				msg?.channel.messages.cache.get(id)?.content ?? msg?.content;
			if (tempContent) {
				this.content = tempContent;
			}
		}

		return this.discord;
	}

	/**
	 * Sends a message on Discord.
	 *
	 * @param options
	 */
	async send(
		options: string | Discord.MessagePayload | Discord.MessageCreateOptions
	): Promise<Discord.Message> {
		return this.discord.channel.send(options);
	}

	async getPermissionsForApplicationCommand(options: {
		commandName: string;
	}): Promise<UserPermissions | undefined> {
		if (this.discord.member && this.discord.msg) {
			function matchingCommandsFilter(
				commands: Discord.Collection<
					string,
					Discord.ApplicationCommand<{
						guild: Discord.GuildResolvable;
					}>
				>,
				name = options.commandName
			) {
				return commands.filter(c => c.name == name);
			}

			// Saves on checking, as admins will always be
			// able to use slash commands
			if (
				this.discord.member.permissions.has(
					Discord.PermissionFlagsBits.Administrator
				)
			) {
				return;
			}

			const client = this.discord.client;
			const guild = this.discord.member.guild;
			// let matchingCommandGuildCache = matchingCommandsFilter(
			// 	guild.commands.cache
			// );
			// matchingCommandGuildCache =
			// 	matchingCommandGuildCache.size == 0
			// 		? matchingCommandsFilter(await guild.commands.fetch())
			// 		: matchingCommandGuildCache;
			let matchingCommandsGlobalCache = client.application
				? matchingCommandsFilter(client.application.commands.cache)
				: new Discord.Collection<
						string,
						Discord.ApplicationCommand<{
							guild: Discord.GuildResolvable;
						}>
				  >();

			if (
				client.application &&
				client.application.commands.cache.size == 0
			) {
				Logger.silly(
					"Fetching application commands for permission check"
				);
				matchingCommandsGlobalCache = matchingCommandsFilter(
					await client.application.commands.fetch()
				);
			}

			const applicationCommand = matchingCommandsGlobalCache.first();
			if (applicationCommand) {
				const perms = await applicationCommand.permissions.fetch({
					guild: guild,
				});
				let rolesBlacklist: string[] = [];
				let rolesWhitelist: string[] = [];
				let channelsWhitelist: string[] = [];
				let channelsBlacklist: string[] = [];

				for (const perm of perms.values()) {
					// discord.js doesn't fill CHANNEL as a proper type
					// @ts-ignore
					if (!perm.type || perm.type == "CHANNEL") {
						perm.permission
							? channelsWhitelist.push(perm.id)
							: channelsBlacklist.push(perm.id);
					} else if (
						perm.type ==
						Discord.ApplicationCommandPermissionType.Role
					) {
						perm.permission
							? rolesWhitelist.push(perm.id)
							: rolesBlacklist.push(perm.id);
					} else if (
						perm.type ==
							Discord.ApplicationCommandPermissionType.User &&
						perm.id == this.discord.author.id &&
						!perm.permission
					) {
						return {
							discord: {
								usersBlacklist: [this.discord.author.id],
							},
						};
					}

					return {
						discord: {
							roles:
								rolesWhitelist.length > 0
									? rolesWhitelist
									: undefined,
							rolesBlacklist:
								rolesBlacklist.length > 0
									? rolesBlacklist
									: undefined,
							channels:
								channelsWhitelist.length > 0
									? channelsWhitelist
									: undefined,
							channelsBlacklist:
								channelsBlacklist.length > 0
									? channelsBlacklist
									: undefined,
						},
					};
				}
			} else {
				Logger.warn("No Discord command found");
			}
		}
	}

	static async startCountdownBeforeDeletion(
		msg: Discord.Message,
		options: {
			seconds: number;
			showTimer: boolean;
		} = {
			seconds: 3,
			showTimer: true,
		}
	): Promise<void> {
		try {
			let startTime: [number, number];
			let content = "";
			for (let i = options.seconds; i > 0; i--) {
				startTime = process.hrtime();

				if (!content) {
					content = msg.content;
				}

				if (options.showTimer && msg) {
					await msg.edit(`${content} (Hiding message in ${i}...)`);
				}

				const stopTime = Math.round(process.hrtime(startTime)[1] / 1e6);
				await Utils.sleep(1000 - stopTime);
			}
			await msg.delete();
		} catch (error) {
			Logger.error((error as Error).stack);
		}
	}
}
