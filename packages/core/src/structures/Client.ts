import * as Discord from "discord.js";
import * as Twitch from "twitch";
import * as TwitchAuth from "twitch-auth";
import * as TwitchChatClient from "twitch-chat-client";

import { ClientOptions } from "../interfaces/ClientOptions";
import { LoginOptions } from "../interfaces/LoginOptions";
import { BaseMessage } from "./BaseMessage";
import { DiscordMessage } from "./DiscordMessage";
import { TwitchMessage } from "./TwitchMessage";

import { APIManager } from "../managers/APIManager";
import { FormattingManager } from "../managers/FormattingManager";
import { PluginManager } from "../managers/PluginManager";

import { EventEmitter } from "events";
import { Logger } from "@framedjs/logger";
import { version } from "../index";

import { CommandManager } from "../managers/CommandManager";
import { BaseProvider } from "../providers/BaseProvider";

const DEFAULT_PREFIX = "!";

export class Client extends EventEmitter {
	api?: APIManager;
	commands!: CommandManager;
	provider!: BaseProvider;
	plugins!: PluginManager;
	formatting!: FormattingManager;

	discord: {
		botOwners: Discord.UserResolvable[];
		client?: Discord.Client;
		defaultPrefix: string;
	} = {
		botOwners: [],
		defaultPrefix: DEFAULT_PREFIX,
	};
	twitch: {
		api?: Twitch.ApiClient;
		auth?: TwitchAuth.RefreshableAuthProvider;
		chat?: TwitchChatClient.ChatClient;
		botOwners: string[];
		defaultPrefix: string;
	} = {
		botOwners: [],
		defaultPrefix: DEFAULT_PREFIX,
	};

	/**
	 * Framed.js version
	 */
	static readonly version = version;

	/**
	 * App version
	 */
	readonly appVersion: string | undefined;

	footer: string | string[] = "";
	readonly importFilter = /^((?!\.d).)*\.(js|ts)$/;
	// readonly importFilter = /(?<!\.d)(\.(js|ts))$/;

	defaultPrefix = DEFAULT_PREFIX;

	constructor(options: ClientOptions) {
		// I have no idea what capture rejections does, but I assume it's a good thing.
		super({ captureRejections: true });

		this.footer = options.footer ? options.footer : [];

		// Sets the app version
		this.appVersion = options.appVersion;

		if (options.defaultPrefix) {
			this.defaultPrefix = options?.defaultPrefix;
		}

		this.discord.defaultPrefix =
			options.discord?.defaultPrefix ?? this.defaultPrefix;

		this.twitch.defaultPrefix =
			options.twitch?.defaultPrefix ?? this.defaultPrefix;

		// Sets the owners from Discord and Twitch
		if (options.discord?.botOwners) {
			this.discord.botOwners =
				typeof options.discord.botOwners == "string"
					? [options.discord.botOwners]
					: options.discord.botOwners;
		}

		if (options.twitch?.botOwners) {
			this.twitch.botOwners =
				typeof options.twitch.botOwners == "string"
					? [options.twitch.botOwners]
					: options.twitch.botOwners;
		}

		// Initializes managers and providers
		if (options.autoInitialize.api != false)
			this.api = new APIManager(this);
		if (options.autoInitialize.commands != false)
			this.commands = new CommandManager(this);
		if (options.autoInitialize.formatting != false)
			this.formatting = new FormattingManager(this);
		if (options.autoInitialize.plugins != false)
			this.plugins = new PluginManager(this);
		if (options.autoInitialize.provider != false)
			this.provider = new BaseProvider(this);
	}

	/**
	 * Login
	 */
	async login(options: LoginOptions[]): Promise<void> {
		// Loads the database
		// await this.database.start();

		// Logins for each platform and sets up some events
		for await (const option of options) {
			// For types of platforms, we try and
			switch (option.type) {
				case "discord":
					if (!option.discord) {
						throw new ReferenceError(
							`Login option type is ${option.type}, but the object supposedly containing its login data is undefined.`
						);
					}

					// Sets up some Discord events and logs into Discord
					this.discord.client = new Discord.Client(
						option.discord.clientOptions
					);
					this.setupDiscordEvents(this.discord.client);
					break;
				case "twitch":
					if (!option.twitch) {
						throw new ReferenceError(
							`Login option type is ${option.type}, but the object supposedly containing its login data is undefined.`
						);
					}

					this.twitch.auth = new TwitchAuth.RefreshableAuthProvider(
						new TwitchAuth.StaticAuthProvider(
							option.twitch.clientId,
							option.twitch.accessToken
							// onRefresh: (token: AccessToken) => {
							// 	// do things with the new token data, e.g. save them in your database
							// }
						),
						{
							clientSecret: option.twitch.clientSecret,
							refreshToken: option.twitch.refreshToken,
						}
					);
					this.twitch.api = new Twitch.ApiClient({
						authProvider: this.twitch.auth,
					});
					this.twitch.chat = new TwitchChatClient.ChatClient(
						this.twitch.auth,
						option.twitch.clientOptions
					);
					this.setupTwitchEvents(this.twitch.chat);
					break;
				default:
					throw new Error(`Platform "${option.type}" is invalid`);
			}
		}

		// Imports all events now, since the plugins are done
		for await (const plugin of this.plugins.map.values()) {
			for (const event of plugin.events.values()) {
				// If the event hasn't been initialized, initialize it
				if (!event.eventInitialized) {
					try {
						plugin.initEvent(event);
					} catch (error) {
						Logger.error(error.stack);
					}
				}
			}

			try {
				await plugin.setupEvents();
			} catch (error) {
				Logger.error(error.stack);
			}
		}

		// Logs into all platforms
		if (this.discord.client) {
			await this.discord.client.login();
		}

		if (this.twitch.chat) {
			await this.twitch.chat.connect();
		}
	}

	async processMsg(msg: BaseMessage): Promise<void> {
		if (msg.command != undefined) {
			if (msg.discord) {
				if (msg.discord.author.bot) return;
				await this.commands.run(msg);
			} else if (msg.twitch) {
				if (this.twitch.chat?.currentNick == msg.twitch.user) return;
				await this.commands.run(msg);
			}
		}
	}

	protected setupDiscordEvents(client: Discord.Client): void {
		client.on("ready", async () => {
			Logger.info(`Logged in as ${client.user?.tag}.`);
		});

		client.on("guildCreate", async guild => {
			Logger.info(
				`Discord.js - Joined a new guild: "${guild.name}" (${guild.id})`
			);
		});

		client.on("message", async discordMsg => {
			const msg = new DiscordMessage({
				client: this,
				discord: {
					base: discordMsg,
				},
			});
			await msg.getMessageElements(
				undefined,
				discordMsg.guild ?? undefined
			);
			this.processMsg(msg);
		});

		client.on("warn", warning => {
			Logger.warn(`Discord.js - ${warning}`);
		});

		client.on("error", error => {
			Logger.error(`Discord.js - ${error}`);
		});

		client.on("rateLimit", info => {
			// Logger.warn(`We're being rate-limited! ${util.inspect(info)}`);
			Logger.warn(
				`Discord.js - Rate limit: ${info.method} ${info.timeout} ${info.limit}`
			);
		});

		client.on("messageUpdate", async (partialOld, partialNew) => {
			try {
				Logger.silly(`Message Update`);

				// Attempts to fetch a partial message, if the bot has permission to do so
				let newMessage: Discord.Message;
				if (partialNew.partial) {
					try {
						if (
							partialOld.guild?.available &&
							partialOld.guild?.me
						) {
							const requestedBotPerms = new Discord.Permissions([
								"READ_MESSAGE_HISTORY",
							]);
							const actualBotPerms = new Discord.Permissions(
								partialOld.guild.me.permissionsIn(
									partialOld.channel
								)
							);

							if (
								actualBotPerms.missing(requestedBotPerms)
									.length > 0
							) {
								return;
							}
						}
						newMessage = await partialNew.channel.messages.fetch(
							partialNew.id
						);
					} catch (error) {
						Logger.error(error.stack);
						return;
					}
				} else {
					newMessage = partialNew;
				}

				// If the content is the same, but something changed (ex. pinned, embed) ignore it
				// to avoid running a command multiple times
				if (partialOld.content == newMessage.content) {
					return;
				}

				// Edge case: pinned uncached messages could still go through.
				// Pins shouldn't be treated as retriggering of commands
				if (!partialOld.pinned && newMessage.pinned) {
					return;
				}

				const msg = new DiscordMessage({
					client: this,
					discord: {
						base: newMessage,
					},
				});
				await msg.getMessageElements(
					undefined,
					msg.discord.guild ?? undefined
				);
				this.processMsg(msg);
			} catch (error) {
				Logger.error(error.stack);
			}
		});
	}

	protected setupTwitchEvents(chat: TwitchChatClient.ChatClient): void {
		chat.onMessage(
			async (channel: string, user: string, message: string) => {
				const msg = new TwitchMessage({
					client: this,
					content: message,
					twitch: {
						chat: chat,
						channel: channel,
						user: user,
					},
				});
				await msg.getMessageElements();
				this.processMsg(msg);
			}
		);

		chat.onJoin((channel: string, user: string) => {
			Logger.info(`Twitch - Logged in as ${user} in ${channel}.`);
		});

		chat.onDisconnect((manually: boolean, reason: Error | undefined) => {
			Logger.warn(
				`Twitch - Got disconnected ${
					manually ? "manually" : "automatically"
				}: ${reason}`
			);
		});
	}
}
