/* eslint-disable no-mixed-spaces-and-tabs */
import "reflect-metadata";
import Discord from "discord.js";
import * as TwitchAuth from "twitch-auth";
import * as Twitch from "twitch-chat-client";
import path from "path";
import { logger } from "shared";
import { EventEmitter } from "events";
import { FramedClientOptions } from "../interfaces/FramedClientOptions";
import { FramedLoginOptions } from "../interfaces/FramedLoginOptions";
import FramedMessage from "./FramedMessage";
import PluginManager from "../managers/PluginManager";
import DatabaseManager from "../managers/DatabaseManager";
import APIManager from "../managers/APIManager";
import { BasePlugin } from "./BasePlugin";
import { version } from "../index";
import FormattingManager from "../managers/FormattingManager";

const DEFAULT_PREFIX = "!";

export default class FramedClient extends EventEmitter {
	public readonly api: APIManager;
	public readonly database: DatabaseManager;
	public readonly plugins = new PluginManager(this);
	public readonly formatting = new FormattingManager(this);

	public discord: {
		client?: Discord.Client;
		defaultPrefix: string;
	} = {
		defaultPrefix: DEFAULT_PREFIX,
	};
	public twitch: {
		auth?: TwitchAuth.RefreshableAuthProvider;
		chatClient?: Twitch.ChatClient;
		defaultPrefix: string;
	} = {
		defaultPrefix: DEFAULT_PREFIX,
	};

	/**
	 * Framed version
	 */
	public static readonly version = version;

	/**
	 * App version
	 */
	public readonly appVersion: string | undefined;

	public readonly helpCommands = [
		"$(command default.bot.info help)",
		"$(command default.bot.fun poll)",
		"$(command com.geekoverdrivestudio.dailies dailies)",
	];
	public readonly importFilter = /^((?!\.d).)*\.(js|ts)$/;
	// public readonly importFilter = /(?<!\.d)(\.(js|ts))$/;

	public defaultPrefix = DEFAULT_PREFIX;

	private readonly clientOptions: FramedClientOptions;

	constructor(options: FramedClientOptions) {
		// I have no idea what capture rejections does, but I assume it's a good thing.
		super({ captureRejections: true });

		this.clientOptions = options;

		// Sets the app version
		this.appVersion = options.appVersion;

		if (options.defaultPrefix) {
			this.defaultPrefix = options?.defaultPrefix;
		}

		this.api = new APIManager(this);

		logger.debug(
			`Using database path: ${options.defaultConnection.database}`
		);
		logger.debug(
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
		logger.debug(`Finished loading default routes`);
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
		logger.debug(`Finished loading default plugins`);
		return plugins;
	}

	async prepareHelpCommandList(): Promise<void> {
		// Properly sets up the help command display
		for (let i = 0; i < this.helpCommands.length; i++) {
			this.helpCommands[i] = await FramedMessage.format(
				this.helpCommands[i],
				this
			);
		}
	}

	/**
	 * Login
	 */
	async login(options: FramedLoginOptions[]): Promise<void> {
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
					this.discord.client = new Discord.Client();
					await this.discord.client.login();
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
						),
						{
							clientSecret: option.twitch.clientSecret,
							refreshToken: option.twitch.refreshToken,
						}
					);
					this.twitch.chatClient = new Twitch.ChatClient(
						this.twitch.auth,
						option.twitch.clientOptions
					);
					this.setupTwitchEvents(this.twitch.chatClient);
					await this.twitch.chatClient.connect();
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

	async processMsg(msg: FramedMessage): Promise<void> {
		if (msg.command) {
			logger.debug(
				`FramedClient.ts: Attempting to run command "${msg.content}"`
			);
			if (msg.discord) {
				if (msg.discord.author.bot) return;
				this.plugins.runCommand(msg);
			} else if (msg.twitch) {
				if (this.twitch.chatClient?.currentNick == msg.twitch.user)
					return;
				this.plugins.runCommand(msg);
			}
		}
	}

	private setupDiscordEvents(client: Discord.Client): void {
		client.on("ready", async () => {
			logger.info(`Logged in as ${client.user?.tag}.`);

			try {
				client
					// Permissions might not work
					.generateInvite({
						permissions: [
							"SEND_MESSAGES",
							"MANAGE_MESSAGES",
							"READ_MESSAGE_HISTORY",
							"MANAGE_ROLES",
							"ADD_REACTIONS",
							"EMBED_LINKS",
							"VIEW_CHANNEL",
						],
					})
					.then(link =>
						logger.info(`Generated bot invite link: ${link}`)
					)
					.catch(logger.error);
			} catch (error) {
				logger.error(error.stack);
			}
		});

		client.on("message", async discordMsg => {
			const msg = new FramedMessage({
				framedClient: this,
				discord: {
					base: discordMsg,
				},
			});
			this.processMsg(msg);
		});

		client.on("warn", warning => {
			logger.warn(`Discord.js: ${warning}`);
		});

		client.on("error", error => {
			logger.error(`Discord.js: ${error}`);
		});

		client.on("rateLimit", info => {
			// logger.warn(`We're being rate-limited! ${util.inspect(info)}`);
			logger.warn(
				`Rate limit: ${info.method} ${info.timeout} ${info.limit}`
			);
		});

		client.on("messageUpdate", async (oldMessage, newMessage) => {
			try {
				logger.silly(`Message Update`);
				logger.silly(
					`oldMessage.content: "${oldMessage.content}" | ${oldMessage.channel}`
				);
				logger.silly(
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
				const msg = new FramedMessage({
					framedClient: this,
					discord: {
						base: newMessage,
					},
				});
				this.processMsg(msg);
			} catch (error) {
				logger.error(error.stack);
			}
		});

		client.on("raw", async packet => {
			// We don't want this to run on unrelated packets
			if (
				!["MESSAGE_REACTION_ADD", "MESSAGE_REACTION_REMOVE"].includes(
					packet.t
				)
			)
				return;

			// Finds user
			let user = client.users.cache.get(packet.d.user_id);
			if (!user) {
				try {
					user = await client.users.fetch(packet.d.user_id);
				} catch (error) {
					return logger.error(
						`Wasn't able to find user from Raw event ${error.stack}`
					);
				}
			}

			// Grab the channel to check the message from
			const channel = client.channels.cache.get(
				packet.d.channel_id
			) as Discord.TextChannel;

			// There's no need to emit if the message is cached, because the event will fire anyway for that
			if (channel?.messages.cache.has(packet.d.message_id)) return;

			// Since we have confirmed the message is not cached, let's fetch it
			channel?.messages.fetch(packet.d.message_id).then(async message => {
				// Emojis can have identifiers of name:id format, so we have to account for that case as well
				const emoji = packet.d.emoji.id
					? `${packet.d.emoji.name}:${packet.d.emoji.id}`
					: packet.d.emoji.name;

				// This gives us the reaction we need to emit the event properly, in top of the message object
				const reaction = message.reactions.cache.get(emoji);

				// Adds the currently reacting user to the reaction's users collection.
				let user = client.users.cache.get(packet.d.user_id);
				if (!user) {
					try {
						user = await client.users.fetch(packet.d.user_id);
					} catch (error) {
						return logger.error(
							`Wasn't able to find user from raw event\n${error.stack}`
						);
					}
				}

				if (reaction) {
					reaction.users.cache.set(packet.d.user_id, user);

					// Check which type of event it is before emitting
					if (packet.t === "MESSAGE_REACTION_ADD") {
						logger.debug(
							"FramedClient: Emitting messageReactionAdd"
						);
						client.emit("messageReactionAdd", reaction, user);
					} else if (packet.t === "MESSAGE_REACTION_REMOVE") {
						client.emit("messageReactionRemove", reaction, user);
					}
				} else {
					logger.error("Unable to find reaction to message!");
				}
			});
		});
	}

	private setupTwitchEvents(chatClient: Twitch.ChatClient): void {
		chatClient.onMessage(
			(channel: string, user: string, message: string) => {
				// if (message === "!ping") {
				// 	chatClient.say(channel, "Pong!");
				// } else if (message === "!dice") {
				// 	const diceRoll = Math.floor(Math.random() * 6) + 1;
				// 	chatClient.say(channel, `@${user} rolled a ${diceRoll}`);
				// }

				const msg = new FramedMessage({
					framedClient: this,
					content: message,
					twitch: {
						chatClient: chatClient,
						channel: channel,
						user: user,
					},
				});
				this.processMsg(msg);
			}
		);

		chatClient.onJoin((channel: string, user: string) => {
			logger.info(`Logged in as ${user} in ${channel}.`);
		});

		chatClient.onDisconnect(
			(manually: boolean, reason: Error | undefined) => {
				logger.warn(
					`Got disconnected ${
						manually ? "manually" : "automatically"
					}: ${reason}`
				);
			}
		);
	}
}
