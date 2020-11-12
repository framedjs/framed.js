import Discord from "discord.js";
import { logger } from "shared";
import FramedClient from "./FramedClient";

export default class FramedMessage {
	public discord?: {
		readonly msg: Discord.Message;
	};

	public readonly framedClient;

	public content = "";

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
		const prefixes = [
			this.framedClient.defaultPrefix,
			...this.framedClient.pluginManager.prefixesArray,
		];
		let prefix: string | undefined;
		for (let i = 0; i < prefixes.length; i++) {
			const element = prefixes[i];
			if (this.content.indexOf(element) === 0) {
				prefix = element;
				break;
			}
		}
		return prefix;
	}

	/**
	 * Gets the arguments of the message.
	 *
	 * Example: `.test "woah spaces" that is 2 cool "aaaa"`
	 * would return the following arguments:
	 *
	 * ```ts
	 * ["test", "woah spaces", "that", "is", 2, "cool", "aaa"]
	 * ```
	 */
	private getArgs(): string[] | undefined {
		if (this.prefix) {
			// Note that this content will still include the command inside
			// the arguments, and will be removed when getCommand() is called
			const content = this.content.slice(this.prefix.length).trim();
			const args = FramedMessage.getArgs(content);

			logger.debug(`Args -> ${args}`);
			return args;
		} else {
			return undefined;
		}

		// return this.prefix
		// 	? this.content.slice(this.prefix.length).trim().split(/ +/g)
		// 	: undefined;
	}

	/**
	 * If an argument parameter is empty, it will be removed.
	 */
	trimmedArgs(): string[] | undefined {
		if (this.args) {
			const newArgs = this.args;

			// Clean-up message args to remove no characters
			for (let i = 0; i < newArgs.length; i++) {
				const element = newArgs[i];
				if (element.length < 1) {
					newArgs.splice(i);
				}
			}
			return newArgs;
		} else {
			return undefined;
		}
	}

	/**
	 * Gets the command of the message.
	 */
	private getCommand(): string | undefined {
		return this.prefix && this.args
			? this.args.shift()?.toLocaleLowerCase()
			: undefined;
	}

	static getArgs(content: string): string[] {
		const args: string[] = [];

		// Stores whether there was a quote character
		// that has happened, and is waiting to be closed
		let hasDoubleQuote = false;

		// Contains the string between the two quote characters
		// or for anything other type of argument
		let quotedString = "";

		// Goes through all the arguments
		for (let i = 0; i < content.length; i++) {
			const element = content[i];
			const isDoubleQuote = element == `"`;
			const isSpace = element == " ";

			// Does the argument that we're trying to make
			// have a quote mark before this, and hasn't closed?
			if (hasDoubleQuote) {
				if (!isDoubleQuote) {
					// Adds to the quoted string
					quotedString += element;
					hasDoubleQuote = true;
				} else if (isDoubleQuote) {
					// Stops adding to the quoted string
					args.push(quotedString);
					hasDoubleQuote = false;
					quotedString = "";
				}
			} else if (isDoubleQuote) {
				// Set it to check for the string between quotes
				hasDoubleQuote = true;
			} else {
				// Parses other kind of argument
				if (!isSpace) {
					// Adds to the argument text
					quotedString += element;
				}

				if (
					(isSpace && quotedString.length > 0) ||
					(!isSpace && i + 1 == content.length)
				) {
					// If it's the last character, or there's content in
					// the quoted string, close it off

					// Pushes the string as an argument, if it's not empty
					args.push(quotedString);
					quotedString = "";
				}
			}
		}

		return args;
	}
}
