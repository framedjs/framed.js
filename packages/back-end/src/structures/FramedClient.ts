import "reflect-metadata";
import Discord from "discord.js";
import fs from "fs";
import path from "path";
import { logger } from "shared";
import { EventEmitter } from "events";
import { FramedClientOptions } from "../interfaces/FramedClientOptions";
import FramedMessage from "./FramedMessage";
import PluginManager from "../managers/PluginManager";
import DatabaseManager from "../managers/DatabaseManager";
import APIManager from "../managers/APIManager";

let version: string | undefined;
// Sets the versions
try {
	const packageFile = fs.readFileSync(
		path.resolve(__dirname, "../../package.json"),
		"utf8"
	);
	const packageJson = JSON.parse(packageFile);
	version = packageJson.version;
} catch (error) {
	logger.error(error.stack);
}

export default class FramedClient extends EventEmitter {
	public readonly api: APIManager;
	public readonly database: DatabaseManager;
	public readonly plugins = new PluginManager(this);

	public readonly client = new Discord.Client();

	/**
	 * Framed version
	 */
	public readonly version: string | undefined;

	/**
	 * App version
	 */
	public readonly appVersion: string | undefined;

	public readonly helpCommands = [
		"$(command default.bot.info.command.help)",
		"$(command default.bot.fun.command.poll)",
		"$(command com.geekoverdrivestudio.dailies.command.dailies)",
	];
	public readonly importFilter = /^((?!\.d).)*\.(js|ts)$/;
	// public readonly importFilter = /(?<!\.d)(\.(js|ts))$/;
	public defaultPrefix = "!";

	// https://www.stefanjudis.com/today-i-learned/measuring-execution-time-more-precisely-in-the-browser-and-node-js/
	private startTime = process.hrtime();

	constructor(info: FramedClientOptions) {
		// I have no idea what capture rejections does, but I assume it's a good thing.
		super({ captureRejections: true });

		// Sets the versions
		this.version = version;
		this.appVersion = info?.appVersion;

		if (info) {
			if (info.defaultPrefix) {
				this.defaultPrefix = info?.defaultPrefix;
			}
		}

		this.api = new APIManager(this);

		logger.verbose(
			`Using database path: ${info.defaultConnection.database}`
		);
		logger.verbose(
			`Using entities path: ${DatabaseManager.defaultEntitiesPath}`
		);

		this.database = new DatabaseManager(
			this,
			info.defaultConnection
		);
	}

	/**
	 * Logins through Discord
	 */
	async login(token?: string): Promise<void> {
		// Loads the API
		logger.verbose(`Using routes path: ${APIManager.defaultPath}`);
		this.api.loadRoutesIn({
			dirname: APIManager.defaultPath,
			filter: this.importFilter,
			excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)\.(js|ts)$/,
		});

		// Loads the default plugins, which loads commands and events
		this.plugins.loadPluginsIn({
			dirname: path.join(__dirname, "..", "plugins"),
			filter: /^(.+plugin)\.(js|ts)$/,
			excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)\.(js|ts)$/,
		});

		// Properly sets up the help command display
		for (let i = 0; i < this.helpCommands.length; i++) {
			this.helpCommands[i] = await FramedMessage.parseCustomFormatting(
				this.helpCommands[i],
				this
			);
		}

		// Loads the database
		await this.database.start();

		// Logs into Discord
		await this.client.login(token);

		this.client.on("ready", async () => {
			// Gets the difference between the start time, and now
			const diffTime = process.hrtime(this.startTime);

			// Fixed decimal places (ex. if set to 3, decimals will be 0.000)
			const fixedDecimals = 3;

			// diffTime[1] is the decimal number as a whole number, so
			// we need to convert that. This will remove some trailing numbers.
			const endDecimalString = String(diffTime[1]).slice(
				0,
				fixedDecimals + 1
			);

			// Negative exponent (for example, 10 ^ -3)
			const negativeExponent = Math.pow(10, -Number(fixedDecimals + 1));

			// Larger number (that should be a decimal) * negative exponent
			// will turn it into a decimal
			const endDecimalNumber = Number(
				Number(endDecimalString) * negativeExponent
			).toFixed(fixedDecimals);

			// Startup time
			const startupTime = (
				diffTime[0] + Number(endDecimalNumber)
			).toFixed(fixedDecimals);

			logger.info(
				`Done (${startupTime}s)! Logged in as ${this.client.user?.tag}.`
			);

			//#region  Log test for NPM
			// logger.silly("test");
			// logger.debug("test");
			// logger.verbose("test");
			// logger.http("test");
			// logger.info("test");
			// logger.warn(`test`);
			// logger.error(`owo`);
			//#endregion

			try {
				this.client
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

		this.client.on("message", async discordMsg => {
			if (discordMsg.author.bot) return;
			const msg = new FramedMessage({
				framedClient: this,
				discord: {
					base: discordMsg,
				},
			});
			this.processMsg(msg);
		});

		this.client.on("warn", warning => {
			logger.warn(`Discord.js: ${warning}`);
		})

		this.client.on("error", error => {
			logger.error(`Discord.js: ${error}`);
		})

		this.client.on("rateLimit", info => {
			// logger.warn(`We're being rate-limited! ${util.inspect(info)}`);
			logger.warn(
				`Rate limit: ${info.method} ${info.timeout} ${info.limit}`
			);
		});

		this.client.on("messageUpdate", async (oldMessage, newMessage) => {
			try {
				logger.debug(`Message Update`);
				logger.debug(`oldMessage.content: "${oldMessage.content}" | ${oldMessage.channel}`);
				logger.debug(`newMessage.content: "${newMessage.content}" | ${newMessage.channel}`);
				
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

		this.client.on("raw", async packet => {
			// We don't want this to run on unrelated packets
			if (
				!["MESSAGE_REACTION_ADD", "MESSAGE_REACTION_REMOVE"].includes(
					packet.t
				)
			)
				return;

			// Finds user
			let user = this.client.users.cache.get(packet.d.user_id);
			if (!user) {
				try {
					user = await this.client.users.fetch(packet.d.user_id);
				} catch (error) {
					return logger.error(
						`Wasn't able to find user from Raw event ${error.stack}`
					);
				}
			}

			// Grab the channel to check the message from
			const channel = this.client.channels.cache.get(
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
				let user = this.client.users.cache.get(packet.d.user_id);
				if (!user) {
					try {
						user = await this.client.users.fetch(packet.d.user_id);
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
						this.client.emit("messageReactionAdd", reaction, user);
					} else if (packet.t === "MESSAGE_REACTION_REMOVE") {
						this.client.emit(
							"messageReactionRemove",
							reaction,
							user
						);
					}
				} else {
					logger.error("Unable to find reaction to message!");
				}
			});
		});
	}

	async processMsg(msg: FramedMessage): Promise<void> {
		logger.debug(`Message: "${msg.content}" | command -> ${msg.command}`);
		if (msg.command) {
			logger.debug(
				`FramedClient.ts: Found command! Contents are: "${msg.content}"`
			);
			this.plugins.runCommand(msg);
		}
	}
}
