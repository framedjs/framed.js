// Tries to get environmental variables if it doesn't exist
// const dotenv = require("dotenv").config({ path: `${process.cwd()}/../.env` });
// if (dotenv.error) {
// 	throw dotenv.error;
// }
// console.log(dotenv.parsed);

// Platforms
import * as Discord from "discord.js";

// Database and JSON imports
// import * as TypeORM from "typeorm";
import { version } from "../../../package.json";

// Other important imports
import { logger, Utils } from "shared";
import Message from "./structures/Message";

// Other utilities
import util from "util";
import PluginManager from "./managers/PluginManager";

export default class FramedClient {
	public readonly pluginManager = new PluginManager();
	public readonly utils = new Utils();
	public readonly client = new Discord.Client();
	public readonly version: string;

	constructor() {
		this.version = version;
	}

	async login(token: string): Promise<void> {
		this.client.login(token);
		this.pluginManager.loadPlugins();

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
		});

		this.client.on("message", async discordMsg => {
			if (discordMsg.author.bot) return;
			const msg = new Message(discordMsg, this);
			this.processMsg(msg);
		});

		this.client.on("rateLimit", info => {
			logger.warn(`We're being rate-limited! ${util.inspect(info)}`);
		});

		this.client.on("messageUpdate", async partial => {
			try {
				const discordMsg = await partial.channel.messages.fetch(partial.id);
				const msg = new Message(discordMsg, this);
				this.processMsg(msg);
			} catch (error) {
				logger.error(error.stack);
			}
		});
	}

	async processMsg(msg: Message): Promise<void> {
		// logger.debug(`command -> ${msg.command}`)
		if (msg.command) {
			logger.debug(`${msg.content}`);
			// TypeScript can't see inside the forEach loop that msg.command is defintiely
			// not undefined, so we're doing this unnessesary variable.
			const cmdString = msg.command;
			
			this.pluginManager.plugins.forEach(element => {
				const cmd = element.commands.get(cmdString);
				if (cmd) {
					cmd.run(msg);
				}
			});
		}
	}
}
