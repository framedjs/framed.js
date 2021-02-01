/* eslint-disable no-mixed-spaces-and-tabs */
import "reflect-metadata";

import * as Discord from "discord.js";
import * as Twitch from "twitch";
import * as TwitchAuth from "twitch-auth";
import * as TwitchChatClient from "twitch-chat-client";

import { ClientOptions } from "../interfaces/ClientOptions";
import { LoginOptions } from "../interfaces/LoginOptions";
import { Message } from "./Message";

import { APIManager } from "../managers/APIManager";
import { DatabaseManager } from "../managers/DatabaseManager";
import FormattingManager from "../managers/FormattingManager";
import { PluginManager } from "../managers/PluginManager";

import { BasePlugin } from "./BasePlugin";
import { EventEmitter } from "events";
import { Logger } from "@framedjs/logger";
import { version } from "../index";

import path from "path";

const DEFAULT_PREFIX = "!";

export class Client extends EventEmitter {
	readonly api: APIManager;
	readonly database: DatabaseManager;
	readonly plugins = new PluginManager(this);
	readonly formatting = new FormattingManager(this);

	discord: {
		client?: Discord.Client;
		defaultPrefix: string;
	} = {
		defaultPrefix: DEFAULT_PREFIX,
	};
	twitch: {
		api?: Twitch.ApiClient;
		auth?: TwitchAuth.RefreshableAuthProvider;
		chat?: TwitchChatClient.ChatClient;
		defaultPrefix: string;
	} = {
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

	readonly helpCommands: string[] = [];
	readonly importFilter = /^((?!\.d).)*\.(js|ts)$/;
	// readonly importFilter = /(?<!\.d)(\.(js|ts))$/;

	defaultPrefix = DEFAULT_PREFIX;
	private guildOrTwitchIdPrefixes = new Map<string, string>();
	readonly guildOrTwitchIdSplitString = ",";

	private readonly clientOptions: ClientOptions;

	constructor(options: ClientOptions) {
		// I have no idea what capture rejections does, but I assume it's a good thing.
		super({ captureRejections: true });

		this.clientOptions = options;

		this.helpCommands = options.defaultHelpCommands
			? options.defaultHelpCommands
			: [];

		// Sets the app version
		this.appVersion = options.appVersion;

		if (options.defaultPrefix) {
			this.defaultPrefix = options?.defaultPrefix;
		}

		this.discord.defaultPrefix = options.discord?.defaultPrefix
			? options.discord.defaultPrefix
			: this.defaultPrefix;

		this.twitch.defaultPrefix = options.twitch?.defaultPrefix
			? options.twitch.defaultPrefix
			: this.defaultPrefix;

		this.api = new APIManager(this);

		Logger.debug(
			`Using database path: ${options.defaultConnection.database}`
		);
		Logger.debug(
			`Using entities path: ${DatabaseManager.defaultEntitiesPath}`
		);

		this.database = new DatabaseManager(this, options.defaultConnection);
	}

	/**
	 * Loads some default API routes
	 */
	loadDefaultRoutes(): void {
		// Loads the API
		this.api.loadRoutesIn({
			dirname: APIManager.defaultPath,
			filter: this.importFilter,
			excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)\.(js|ts)$/,
		});
		Logger.debug(`Loaded default routes`);
	}

	/**
	 * Loads some default plugins
	 */
	loadDefaultPlugins(): BasePlugin[] {
		// Loads the default plugins, which loads commands and events
		const plugins = this.plugins.loadPluginsIn({
			dirname: path.join(__dirname, "..", "plugins"),
			filter: /^(.+plugin)\.(js|ts)$/,
			excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)\.(js|ts)$/,
		});
		Logger.debug(`Loaded default plugins`);
		return plugins;
	}

	async prepareHelpCommandList(): Promise<void> {
		// Properly sets up the help command display
		for (let i = 0; i < this.helpCommands.length; i++) {
			this.helpCommands[i] = await Message.format(
				this.helpCommands[i],
				this
			);
		}
	}

	/**
	 * Login
	 */
	async login(options: LoginOptions[]): Promise<void> {
		// Loads the database
		await this.database.start();

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
					// this.discord.client = new Discord.Client();
					this.discord.client = new Discord.Client({
						partials: ["MESSAGE", "CHANNEL", "REACTION", "USER"],
					});
					this.setupDiscordEvents(this.discord.client);
					await this.discord.client.login();
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
					await this.twitch.chat.connect();
					break;
				default:
					throw new Error(`Platform "${option.type}" is invalid`);
			}
		}

		// Imports default routes
		if (
			this.clientOptions.loadDefaultRoutes == true ||
			this.clientOptions.loadDefaultRoutes === undefined
		) {
			this.loadDefaultRoutes();
		}

		// Imports default plugins
		if (
			this.clientOptions.loadDefaultPlugins == true ||
			this.clientOptions.loadDefaultRoutes === undefined
		) {
			this.loadDefaultPlugins();
		}

		// Imports all events now, since the plugins are done
		this.plugins.map.forEach(plugin => {
			plugin.events.forEach(event => {
				// If the event hasn't been initialized, initialize it
				if (!event.eventInitialized) {
					plugin.initEvent(event);
				}
			});
		});

		// Prepares help command list
		await this.prepareHelpCommandList();
	}

	async processMsg(msg: Message): Promise<void> {
		if (msg.command) {
			if (msg.discord) {
				if (msg.discord.author.bot) return;
				this.plugins.runCommand(msg);
			} else if (msg.twitch) {
				if (this.twitch.chat?.currentNick == msg.twitch.user) return;
				this.plugins.runCommand(msg);
			}
		}
	}

	private setupDiscordEvents(client: Discord.Client): void {
		client.on("ready", async () => {
			Logger.info(`Logged in as ${client.user?.tag}.`);
		});

		client.on("guildCreate", async guild => {
			Logger.info(
				`Discord.js - Joined a new guild: "${guild.name}" (${guild.id})`
			);
		});

		client.on("message", async discordMsg => {
			const msg = new Message({
				client: this,
				discord: {
					base: discordMsg,
				},
			});
			await msg.getMessageElements();
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

		client.on("messageUpdate", async (oldMessage, newMessage) => {
			try {
				Logger.silly(`Message Update`);
				Logger.silly(
					`oldMessage.content: "${oldMessage.content}" | ${oldMessage.channel}`
				);
				Logger.silly(
					`newMessage.content: "${newMessage.content}" | ${newMessage.channel}`
				);

				// If the content is the same, ignore it.
				/**
				 * Assumably, this can trigger randomly before a command with an embed (ex. link)
				 * is sent, or after it is sent. By comparing the contents, and seeing if they're the same,
				 * we don't need to accidentally run the same command again.
				 */
				if (oldMessage.content == newMessage.content) return;

				newMessage = await newMessage.channel.messages.fetch(
					newMessage.id
				);
				const msg = new Message({
					client: this,
					discord: {
						base: newMessage,
					},
				});
				await msg.getMessageElements();
				this.processMsg(msg);
			} catch (error) {
				Logger.error(error.stack);
			}
		});
	}

	private setupTwitchEvents(chat: TwitchChatClient.ChatClient): void {
		chat.onMessage(
			async (channel: string, user: string, message: string) => {
				const msg = new Message({
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

	/**
	 * Sets the guild or Twitch channel ID's default prefix.
	 *
	 * @param id Prefix ID
	 * @param guildOrTwitchId guild or twitch ID
	 * @param prefix Prefix string
	 */
	async setGuildOrTwitchIdPrefix(
		id: string,
		guildOrTwitchId: string,
		prefix: string
	): Promise<void> {
		await this.database.addPrefix(prefix, id, guildOrTwitchId, true);
		this.guildOrTwitchIdPrefixes.set(
			`${id}${this.guildOrTwitchIdSplitString}${guildOrTwitchId}`,
			prefix
		);
	}

	/**
	 * Deletes the guild or Twitch channel ID's default prefix.
	 *
	 * @param id Prefix ID
	 * @param guildOrTwitchId guild or twitch ID
	 */
	async deleteGuildOrTwitchIdPrefix(
		id: string,
		guildOrTwitchId: string
	): Promise<void> {
		if (
			this.guildOrTwitchIdPrefixes.get(
				`${id}${this.guildOrTwitchIdSplitString}${guildOrTwitchId}`
			)
		) {
			await this.database.deletePrefix(id, guildOrTwitchId);
		}

		this.guildOrTwitchIdPrefixes.delete(
			`${id}${this.guildOrTwitchIdSplitString}${guildOrTwitchId}`
		);
	}

	/**
	 * Gets the guild or Twitch channel ID's default prefix.
	 *
	 * @param id Prefix ID
	 * @param guildOrTwitchId guild or twitch ID
	 */
	getGuildOrTwitchIdPrefix(
		id: string,
		guildOrTwitchId: string
	): string | undefined {
		return this.guildOrTwitchIdPrefixes.get(
			`${id}${this.guildOrTwitchIdSplitString}${guildOrTwitchId}`
		);
	}

	get guildOrTwitchIdPrefixesArray(): [string, string][] {
		return Array.from(this.guildOrTwitchIdPrefixes);
	}
}
