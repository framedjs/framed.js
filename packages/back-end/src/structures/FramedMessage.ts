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
					: info.discord.base?.discord?.id && info.discord.base?.discord?.channel
					? info.discord.base?.discord?.channel?.messages.cache.get(info.discord.base.discord.id)
					: undefined;

			const newDiscordClient = info.discord.client
				? info.discord.client
				: info.discord.base instanceof Discord.Message
				? info.discord.base.client
				: info.discord.base?.discord?.client;

			const newId = info.discord.id
				? info.discord.id
				: newMsg
				? newMsg.id
				: info.discord.base instanceof Discord.Message
				? info.discord.base.id
				: info.discord.base?.discord?.id;

			const newChannel = info.discord.channel
				? info.discord.channel
				: newMsg
				? newMsg.channel
				: info.discord.base instanceof Discord.Message
				? info.discord.base.channel
				: info.discord.base?.discord?.channel;

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

			const newMember = info.discord.member
				? info.discord.member
				: newAuthor?.id 
				? newGuild?.member(newAuthor.id)
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
				member: newMember,
				guild: newGuild,
			};

			// Sets the content
			let newContent = info.content;
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

			// logger.debug(util.inspect(this.discord, undefined, 0));
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
			// logger.debug(`Args -> ${args}`);
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
}
