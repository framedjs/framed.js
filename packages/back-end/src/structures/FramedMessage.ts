import Discord from "discord.js";
import { logger } from "shared";
import FramedClient from "./FramedClient";

export default class FramedMessage {
	public discord?: {
		readonly msg: Discord.Message;
	};

	public readonly framedClient;

	public content?: string;

	public readonly prefix?: string;
	public readonly args?: Array<string>;
	public readonly command?: string;

	constructor(msg: Discord.Message, framedClient: FramedClient) {
		if (msg) {
			this.discord = {
				msg: msg,
			};

			if (msg.content) {
				this.content = msg.content;
			}
		}
		this.framedClient = framedClient;
		this.prefix = this.getPrefix();
		this.args = this.getArgs();
		this.command = this.getCommand();
	}

	/**
	 * Gets the prefix of the message.
	 */
	getPrefix(): string | undefined {
		// Loops through potential prefixes, and gets a valid one into a variable called "prefix"
		// let prefixes = [process.env.PREFIX!, `<@!${client.user?.id}>`];
		const prefixes = [".", "!"];
		let prefix: string | undefined;
		for (let i = 0; i < prefixes.length; i++) {
			const element = prefixes[i];
			if (this.content?.indexOf(element) === 0) {
				prefix = element;
				break;
			}
		}
		return prefix;
	}

	/**
	 * Gets the arguments of the message.
	 */
	getArgs(): string[] | undefined {
		return this.prefix
			? this.content?.slice(this.prefix.length).trim().split(/ +/g)
			: undefined;
	}

	parseQuotesInArgs(args?: string[]): string[] | undefined {
		if (!args) return undefined;
		const argsContent = args.join(' ');

		logger.debug("from parseQuotesInArgs")
		logger.debug(`argsContent: ${argsContent}`);
		logger.debug(`${argsContent.split("\"")}`);
	}

	/**
	 * Gets the command of the message.
	 */
	getCommand(): string | undefined {
		return this.prefix && this.args 
			? this.args.shift()?.toLocaleLowerCase()
			: undefined
	}
}
