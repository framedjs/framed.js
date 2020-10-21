// Tries to get environmental variables if it doesn't exist
// const dotenv = require("dotenv").config({ path: `${process.cwd()}/../.env` });
// if (dotenv.error) {
// 	throw dotenv.error;
// }
// console.log(dotenv.parsed);

// import { createUser, showUser, User } from 'shared';
// const user: User = createUser('t7yang', 18);
// showUser(user);

// Platforms
import * as Discord from "discord.js";

// Database and JSON imports
import * as TypeORM from "typeorm";

// Other important imports
import * as Shared from "shared";
import Message from "./structures/Message";

// Other utilities
import util from "util";
import Utils from "./util/Utils";
import PluginManager from "./managers/PluginManager";

const logger = Shared.logger;

export default class FramedClient {
	public readonly pluginManager = new PluginManager();
	public readonly utils = new Utils();
	public readonly client = new Discord.Client();

	constructor() {
		// Empty
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
			let msg = new Message(discordMsg);
		});

		this.client.on("rateLimit", info => {
			logger.warn(`We're being rate-limited! ${util.inspect(info)}`);
		});

		this.client.on("messageUpdate", async msg => {
			// Empty
		});
	}
}
