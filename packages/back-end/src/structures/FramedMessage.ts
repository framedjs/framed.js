/* eslint-disable no-mixed-spaces-and-tabs */
import { oneLine } from "common-tags";
import Discord from "discord.js";
import { logger } from "shared";
import { FramedMessageDiscordData } from "../interfaces/FramedMessageDiscordData";
import { FramedMessageInfo } from "../interfaces/FramedMessageInfo";
import util from "util";
import { FramedMessageArgsSettings } from "../interfaces/FramedMessageArgsSettings";

enum ArgumentState {
	Quoted,
	Unquoted,
}

export default class FramedMessage {
	public readonly framedClient;

	public discord?: FramedMessageDiscordData;

	public content = "";

	public prefix?: string;
	public args?: Array<string>;
	public command?: string;

	constructor(info: FramedMessageInfo) {
		if (info.discord) {
			const newMsg =
				info.discord.id && info.discord.channel
					? info.discord.channel.messages.cache.get(info.discord.id)
					: info.discord.base instanceof Discord.Message
					? info.discord.base
					: undefined;

			const newDiscordClient = info.discord.client
				? info.discord.client
				: info.discord.base instanceof Discord.Message
				? info.discord.base.client
				: undefined;

			const newId = info.discord.id
				? info.discord.id
				: newMsg
				? newMsg.id
				: undefined;

			const newChannel = info.discord.channel
				? info.discord.channel
				: newMsg
				? newMsg.channel
				: undefined;

			const newAuthor = info.discord.author
				? info.discord.author
				: newMsg
				? newMsg.author
				: undefined;

			const newGuild = info.discord.guild
				? info.discord.guild
				: newMsg
				? newMsg.guild
				: null;

			// Gets client or throws error
			if (!newDiscordClient) {
				throw new Error(
					oneLine`Parameter discord.client wasn't set when creating FramedMessage!
						This value should be set if the discord.msg parameter hasn't been set.`
				);
			}

			// Gets channel or throws error
			if (!newChannel) {
				throw new Error(
					oneLine`Parameter discord.channel wasn't set when creating FramedMessage!
						This value should be set if the discord.msg parameter hasn't been set.`
				);
			}

			// Gets author or throws error
			if (!newAuthor) {
				throw new Error(
					oneLine`discordClient.user is null, and discord.author is undefined.`
				);
			}

			// If there's an msg object, we set all the relevant values here
			this.discord = {
				msg: newMsg,
				client: newDiscordClient,
				id: newId,
				channel: newChannel,
				author: newAuthor,
				guild: newGuild,
			};

			// Sets the content
			let newContent = info.discord.content;
			if (!newContent) {
				if (newId) {
					newContent = newChannel.messages.cache.get(newId)?.content;
					if (!newContent) {
						newContent = "";
					}
				} else {
					newContent = "";
				}
			}

			this.content = newContent;

			logger.debug(util.inspect(this.discord, undefined, 0));
		}

		this.framedClient = info.framedClient;
		this.prefix = this.getPrefix();
		this.args = this.getArgs();
		this.command = this.getCommand();
	}

	/**
	 * Gets the prefix of the message.
	 */
	getPrefix(): string | undefined {
		const prefixes = [...this.framedClient.pluginManager.defaultPrefixes];
		let prefix: string | undefined;
		for (const testPrefix of prefixes) {
			if (this.content.startsWith(testPrefix)) {
				prefix = testPrefix;
				break;
			}
		}
		return prefix;
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
	 * Removes unescaped quotes from arguments
	 * @param args Message arguments
	 */
	static removeQuotesFromArgs(args: string[]): string[] {
		const newArgs: string[] = [];
		for (const arg of args) {
			let newArg = "";

			// Scans through the string
			for (let i = 0; i < arg.length; i++) {
				const lastChar = arg[i - 1];
				const char = arg[i];

				// Checks if this current char is not a ", and before that wasn't escaping it
				if (char != `"` || lastChar == "\\") {
					newArg += char;
				}
			}

			// Push results
			newArgs.push(newArg);
		}

		return newArgs;
	}

	/**
	 * @param content Message content
	 * @param settings Argument parse settings
	 */
	static getArgs(
		content: string,
		settings?: FramedMessageArgsSettings
	): string[] {
		const args: string[] = [];

		// Remove excess spaces
		content = content.trim();

		// Parse states; for if in a quoted/unquoted section, or is in a codeblock
		let state = ArgumentState.Unquoted;
		let hasCodeBlock = false;

		// What the current argument is
		let argString = "";

		for (let i = 0; i < content.length; i++) {
			const char = content[i];

			// Character comparisons
			const charIsDoubleQuote = char == `"`;
			const charIsSpace = char == " ";
			const charIsCodeBlock = char == "`";

			// Special character comparisons
			const charIsEscaped = content[i - 1] == "\\";
			const charIsEnd = i + 1 == content.length;

			// hasCodeBlock will be true when the message has codeblocks
			if (charIsCodeBlock) hasCodeBlock = !hasCodeBlock;

			// Check for state change
			let stateChanged = false;
			let changeStateToUnquotedLater = false;
			let justStartedQuote = false;

			// If there was a " to close off a quote section
			// and the character hasn't been escaped by a \ or `
			if (charIsDoubleQuote && !(charIsEscaped || hasCodeBlock)) {
				stateChanged = true;

				switch (state) {
					case ArgumentState.Quoted:
						// NOTE: we don't unquote it back immediately, so we
						// can process the last " character
						changeStateToUnquotedLater = true;
						// state = ArgumentState.Unquoted
						break;
					case ArgumentState.Unquoted:
						state = ArgumentState.Quoted;
						justStartedQuote = true;
						break;
				}
			}

			if (state == ArgumentState.Unquoted) {
				// If we're unquoted, split with spaces if settings allow it
				// We'll process excess spaces later
				if (!charIsSpace || settings?.separateByQuoteSections) {
					argString += char;
					// logger.debug(`uq '${argString}'`); // LARGE DEBUG OUTPUT
				} else if (argString.length != 0) {
					// A separator space has been used, so we push our non-empty argument
					// logger.debug(
					// 	`'${char}' <${content}> ${i} Unquoted "${argString}"`
					// ); // LARGE DEBUG OUTPUT
					// Trim argument string, since we're pushing an unquoted argument
					FramedMessage.pushArgs(args, argString.trim(), state);
					argString = "";
				}
			} else if (state == ArgumentState.Quoted) {
				// If we've just started the quote, but the string isn't empty,
				// push its contents out (carryover from unquoted)
				if (justStartedQuote && argString.trim().length != 0) {
					// logger.debug(
					// 	`'${char}' <${content}> ${i} JSQ_NonEmpty - CStU: ${changeStateToUnquotedLater} justStartedQuote ${justStartedQuote} - (${ArgumentState[state]}) - "${argString}"`
					// ); // LARGE DEBUG OUTPUT

					// Since it's been carried over as an unquoted argument
					// And is just finishing in quoted, we can trim it here
					FramedMessage.pushArgs(args, argString.trim(), state);
					argString = "";
				} else if (
					settings?.showQuoteCharacters ||
					!charIsDoubleQuote ||
					charIsEscaped
				) {
					// If we should be showing quoted characters because of settings,
					// or we're unquoted, or there's an escape if not
					argString += char;
					// logger.debug(` q '${argString}'`); // LARGE DEBUG OUTPUT
				}
			}

			// If state change, and the first character isn't a " and just that,
			// or this is the end of the string,
			// push the new argument
			if (
				(stateChanged && !justStartedQuote) ||
				(charIsEnd && argString.length > 0)
			) {
				// Is ending off with a quote
				// logger.debug(
				// 	`'${char}' <${content}> ${i} State change - CStU: ${changeStateToUnquotedLater} justStartedQuote ${justStartedQuote} - (${ArgumentState[state]}) - "${argString}"`
				// ); // LARGE DEBUG OUTPUT

				// Trim if unquoted
				if (state == ArgumentState.Unquoted)
					argString = argString.trim();

				FramedMessage.pushArgs(args, argString, state);

				argString = "";
			}

			// Finally changes the state to the proper one
			// We don't do this for quotes because we need to process putting the " in or not
			if (changeStateToUnquotedLater) {
				state = ArgumentState.Unquoted;
			}
		}

		return args;
	}

	/**
	 * Pushes arguments into a string array, with added checks
	 * @param args Current arguments for the message so far
	 * @param argString Current suggested argument
	 * @param state Argument state
	 * @param justStartedQuote Did the quote just start
	 */
	private static pushArgs(
		args: string[],
		argString: string,
		state: ArgumentState
	): string | undefined {
		// switch (state) {
		// 	case ArgumentState.Quoted:
		// 		break;

		// 	case ArgumentState.Unquoted:
		// 		argString = argString.trim();
		// 		break;
		// }

		const unquoted = state == ArgumentState.Unquoted;
		const noContentFastSwitch = false;
		// state == ArgumentState.Quoted && justStartedQuote;

		// Checks if the args strings wasn't empty and unquoted, so we don't
		// add an unnessesary empty space argument
		if (unquoted || !noContentFastSwitch) {
			args.push(argString);
			return argString;
		}
	}

	/**
	 * Voodoo magic that grabs parameters off of string, by grouping
	 * (properly) quoted strings in text, excluding codeblocks and escaped characters.
	 *
	 * @param content Message content
	 * @param showWrapperQuotes
	 */
	static oldGetArgs(
		content: string,
		settings?: FramedMessageArgsSettings
	): string[] {
		const args: string[] = [];

		// Stores whether if we're in a codebloack or not
		let hasCodeBlock = false;

		// Stores whether there was a quote character
		// that has happened, and is waiting to be closed
		let hasDoubleQuote = false;

		// Have hasDoubleQuote be forever true, since it will act as if
		// there was a double quote for everything
		if (settings?.separateByQuoteSections) {
			hasDoubleQuote = true;
		}
		// hasDoubleQuote = true;

		// Same as hasDoubleQuote, but cannot be overridden by
		// the separateByQuoteSections setting.
		// CAN ONLY BE USED WHEN THAT SETTING IS TRUE
		let separateByQuoteHasDoubleQuote = false;

		// Immediately trim the excessive spaces
		content = content.trim();

		// If the first character is a quote, be prepared to close it off
		if (content[0] == `"`) {
			separateByQuoteHasDoubleQuote = true;
		}

		console.log(content);

		// To be used with separateByQuoteSections setting
		let hasPushedStringOnce = false;

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
				if (isDoubleQuote && !isEscaped && !hasCodeBlock) {
					// We are inside a double quote, and are about to seemingly close it

					if (!settings?.separateByQuoteSections) {
						// Closes quotes, if the option to disallow it is false
						hasDoubleQuote = false;
					} else {
						// Removes any unnesseary spaces, if parsed from quote sections
						// and the quotedString isn't surrounded by quotes
						if (!separateByQuoteHasDoubleQuote) {
							quotedString = quotedString.trim();
						}
						separateByQuoteHasDoubleQuote = !separateByQuoteHasDoubleQuote;
					}

					// Adds the quote if it's set as an option to
					if (settings?.showQuoteCharacters) {
						quotedString += element;
					}

					// Stops adding to the quoted string
					// Checks if there is no special edge case, or there is,
					// BUT we've already pushed before, or there's actual content in the string
					if (
						!settings?.separateByQuoteSections ||
						hasPushedStringOnce ||
						quotedString.length > 0
					) {
						args.push(quotedString);
						hasPushedStringOnce = true;
					}
					// console.log(`END: "${quotedString}"\n`);
					quotedString = "";
				} else if (!isDoubleQuote || hasCodeBlock) {
					// Adds to the quoted string, if it isn't a quote, or it is
					// but it's suppsoed to be escaped in some way
					quotedString += element;
					// console.log(`Add: ${quotedString}` + "\n");

					// If it's the end of the string, and the user forgot
					// to add a closing ", we close it for them
					if (isEndOfString) {
						// Cleans it up if there's spaces, and we're not in a quote
						if (!separateByQuoteHasDoubleQuote) {
							quotedString = quotedString.trim();
						}

						args.push(quotedString);
						quotedString = "";
					}
				}
			} else if (isDoubleQuote && !isEscaped) {
				// We may be starting a quote section
				if (!hasCodeBlock) {
					// Set it to check for the string between quotes
					hasDoubleQuote = true;

					// Add to arguments of what happened before, if anything
					// was contained in quotedString
					if (quotedString.length > 0) {
						args.push(quotedString);
						quotedString = "";
					}

					// Adds the quote if it's set as an option to
					if (settings?.showQuoteCharacters) {
						quotedString += element;
					}
				} else if (hasCodeBlock) {
					// If there's a codeblock, make sure we add codeblock characters
					// it in, since it doesn't add it otherwise.
					// We also don't enter into a "real" double quote.
					quotedString += element;
				}
			} else {
				// Where we're not going into a quote, nor are in one currently
				// Normally, we'll just add to the string.

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
