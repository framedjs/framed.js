import Discord from "discord.js";
import { logger } from "shared";
import FramedClient from "./FramedClient";

export default class FramedMessage {
	public discord?: {
		readonly msg: Discord.Message;
	};

	public readonly framedClient;

	public content = "";

	public prefix?: string;
	public args?: Array<string>;
	public command?: string;

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
	static trimArgs(args: string[]): string[] {
		return args.filter(function (e) {
			return e;
		});
	}

	/**
	 * Gets the command of the message.
	 */
	private getCommand(): string | undefined {
		return this.prefix && this.args
			? this.args.shift()?.toLocaleLowerCase()
			: undefined;
	}

	/**
	 * Voodoo magic that grabs parameters off of string, by grouping
	 * (properly) quoted strings in text, excluding codeblocks and escaped characters.
	 *
	 * @param content Message content
	 */
	static getArgs(content: string): string[] {
		const args: string[] = [];

		// Stores whether if we're in a codebloack or not
		let hasCodeBlock = false;

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
			const isCodeBlock = element == "`";
			const isEndOfString = i + 1 == content.length;
			const isEscaped = content[i - 1] == "\\";

			// hasCodeBlock will be true when the message has codeblocks
			if (isCodeBlock) {
				hasCodeBlock = !hasCodeBlock;
			}
			// console.log(
			// 	`hasCodeBlock: ${hasCodeBlock} | hasDoubleQuote: ${hasDoubleQuote} | isEndOfString: ${isEndOfString}`
			// );

			if (hasDoubleQuote) {
				// We are inside a double quote
				if (isDoubleQuote && !isEscaped) {
					// If it isn't in a codeblock
					if (!hasCodeBlock) {
						// Closes double quote
						hasDoubleQuote = false;

						// Stops adding to the quoted string
						args.push(quotedString);
						// console.log(`END: "${quotedString}"\n`);
						quotedString = "";
					}
				} else if (!isDoubleQuote || hasCodeBlock) {
					// Adds to the quoted string, if it isn't a quote, or it is
					// but it's suppsoed to be escaped in some way
					quotedString += element;
					hasDoubleQuote = true;
					// console.log(`Add: ${quotedString}` + "\n");

					// If it's the end of the string, and the user forgot
					// to add a closing ", we close it for them
					if (isEndOfString) {
						args.push(quotedString);
						quotedString = "";
					}
				}
			} else if (isDoubleQuote && !isEscaped) {
				// We are starting a double quote potentially
				if (!hasCodeBlock) {
					// Set it to check for the string between quotes
					hasDoubleQuote = true;

					// Add to arguments of what happened before, if anything
					// was contained in quotedString
					if (quotedString.length > 0) {
						args.push(quotedString);
						quotedString = "";
					}
				} else if (hasCodeBlock) {
					// If there's a codeblock, make sure we add codeblock characters
					// it in, since it doesn't add it otherwise.
					// We also don't enter into a "real" double quote.
					quotedString += element;
				}
			} else {
				// Where we're not going into a quote, nor are in one currently

				// Will add to the quotedString if a space
				// that splits things apart doesn't exist
				if (!isSpace || (isSpace && hasCodeBlock)) {
					// Adds to the argument text
					quotedString += element;
					// console.log("else: " + quotedString + "\n");
				}

				// console.log(`else: ${(!isSpace || hasCodeBlock)}`)

				if (
					// Checks if there's a space, but there's content in
					// quotedString and not in a codeblock
					(isSpace && quotedString.length > 0 && !hasCodeBlock) ||
					// Checks if there's no space and it's the last character
					(!isSpace && isEndOfString)
				) {
					// Pushes the string as an argument, if it's not empty
					// console.log(`ELSE END: "${quotedString}"\n`);
					args.push(quotedString);
					quotedString = "";
				}
			}
		}

		return args;
	}
}
