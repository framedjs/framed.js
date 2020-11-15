// Platforms
import Discord from "discord.js";

// File data related imports
// import * as TypeORM from "typeorm";
import { version } from "../../../../package.json";
import path from "path";

// Other important imports
import { logger, Utils } from "shared";
import FramedMessage from "./FramedMessage";
import PluginManager from "../managers/PluginManager";
import { EventEmitter } from "events";
import { FramedClientInfo } from "../interfaces/FramedClientInfo";

export default class FramedClient extends EventEmitter {
	public readonly pluginManager = new PluginManager(this);
	public readonly utils = new Utils();
	public readonly client = new Discord.Client();
	public readonly version: string;
	public readonly backEndVersion: string;

	public defaultPrefix = "!";

	constructor(info?: FramedClientInfo) {
		// I have no idea what capture rejections does, but I assume it's a good thing.
		super({ captureRejections: true });
		this.version = version;
		this.backEndVersion = info?.backEndVersion ? info.backEndVersion : "unknown";
		
		if (info) {
			if (info.defaultPrefix) this.defaultPrefix = info?.defaultPrefix;
		}
	}

	async login(token: string): Promise<void> {
		this.client.login(token);
		// this.pluginManager.loadPlugins();

		this.pluginManager.loadPluginsIn({
			dirname: path.join(__dirname, "..", "..", "plugins"),
			filter: /^(.+plugin)\.(js|ts)$/,
		});

		this.client.on("ready", async () => {
			logger.info(`Logged in as ${this.client.user?.tag}!`);

			//#region  Log test for NPM
			// logger.silly("test");
			// logger.debug("test");
			// logger.verbose("test");
			// logger.http("test");
			// logger.info("test");
			// logger.warn(`test`);
			// logger.error(`owo`);
			//#endregion

			this.client
				// Permissions might not work
				.generateInvite([
					"SEND_MESSAGES",
					"MANAGE_MESSAGES",
					"READ_MESSAGE_HISTORY",
					"MANAGE_ROLES",
					"ADD_REACTIONS",
					"EMBED_LINKS",
					"VIEW_CHANNEL",
				])
				.then(link => logger.info(`Generated bot invite link: ${link}`))
				.catch(logger.error);

			this.client.user
				?.setPresence({
					activity: {
						name: `.help | Maintaining Streaks`,
					},
				})
				.then(logger.debug)
				.catch(logger.error);
		});

		this.client.on("message", async discordMsg => {
			if (discordMsg.author.bot) return;
			const msg = new FramedMessage(discordMsg, this);
			this.processMsg(msg);
		});

		this.client.on("rateLimit", info => {
			// logger.warn(`We're being rate-limited! ${util.inspect(info)}`);
			logger.warn(
				`Rate limit: ${info.method} ${info.timeout} ${info.limit}`
			);
		});

		this.client.on("messageUpdate", async partial => {
			try {
				const discordMsg = await partial.channel.messages.fetch(
					partial.id
				);
				const msg = new FramedMessage(discordMsg, this);
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

			// If it's a bot, nah
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
			// console.log("packet: " + util.inspect(packet))
			// console.log("bot: " + user.bot)

			// Grab the channel to check the message from
			const channel = this.client.channels.cache.get(
				packet.d.channel_id
			) as Discord.TextChannel;

			console.log(channel?.messages.cache.has(packet.d.message_id));

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
							`Wasn't able to find user from Raw event ${error.stack}`
						);
					}
				}

				if (reaction) {
					reaction.users.cache.set(packet.d.user_id, user);

					// Check which type of event it is before emitting
					if (packet.t === "MESSAGE_REACTION_ADD") {
						logger.debug("!! EMITTING messageReactionAdd");
						this.client.emit("messageReactionAdd", reaction, user);
					} else if (packet.t === "MESSAGE_REACTION_REMOVE") {
						this.client.emit(
							"messageReactionRemove",
							reaction,
							user
						);
					}
				} else {
					logger.error("unable to find reaction");
				}
			});
		});
	}

	async processMsg(msg: FramedMessage): Promise<void> {
		// logger.debug(`command -> ${msg.command}`)
		if (msg.command) {
			logger.debug(`${msg.content}`);
			this.pluginManager.runCommand(msg);
		}
	}
}
