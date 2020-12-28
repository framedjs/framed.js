/* eslint-disable no-mixed-spaces-and-tabs */
import { oneLine } from "common-tags";
import Discord from "discord.js";
import { FramedDiscordMessage } from "../interfaces/FramedDiscordMessage";
import { FramedMessageOptions } from "../interfaces/FramedMessageOptions";
import { FramedArgumentOptions } from "../interfaces/FramedArgumentOptions";
import { FramedArgument } from "../interfaces/FramedArgument";
import { QuoteSections } from "../interfaces/QuoteSections";
import Emoji from "node-emoji";
import FramedClient from "./FramedClient";
import { logger } from "shared";
import { BaseSubcommand } from "./BaseSubcommand";

enum ArgumentState {
	Quoted,
	Unquoted,
}

export default class FramedMessage {
	public readonly framedClient;

	public discord?: FramedDiscordMessage;

	public content = "";
	public prefix?: string;
	public args?: Array<string>;
	public command?: string;

	/**
	 * Create a new Framed message instance
	 *
	 * @param info Framed Message info
	 */
	constructor(info: FramedMessageOptions) {
		if (info.discord) {
			const newMsg =
				info.discord.id && info.discord.channel
					? info.discord.channel.messages.cache.get(info.discord.id)
					: info.discord.base instanceof Discord.Message
					? info.discord.base
					: info.discord.base?.discord?.id &&
					  info.discord.base?.discord?.channel
					? info.discord.base?.discord?.channel?.messages.cache.get(
							info.discord.base.discord.id
					  )
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
		const prefixes = [...this.framedClient.plugins.allPossiblePrefixes];
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
		// Gets the first arg from args, and sets it to all lowercase
		let command = this.args?.shift()?.toLocaleLowerCase();

		// Normally, args don't split on \n so we do that here
		if (command) {
			command = command.split("\n")[0];
		}

		// If there was a prefix, and there was args, we can
		return this.prefix && this.args ? command : undefined;
	}

	/**
	 * Gets the arguments of the message.
	 *
	 * Example: `.test "woah spaces" that is 2 cool "aaaa"`
	 * would return the following arguments:
	 *
	 * ```ts
	 * ["test", "woah spaces", "that", "is", "2", "cool", "aaa"]
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
	}

	/**
	 * Get the command arguments from a string
	 *
	 * @param content Message content
	 * @param settings Argument parse settings
	 *
	 * @returns Command arguments
	 */
	static getArgs(
		content: string,
		settings?: FramedArgumentOptions
	): string[] {
		const args = FramedMessage.simplifyArgs(
			FramedMessage.getDetailedArgs(content, settings)
		);
		return args;
	}

	/**
	 * Turn FramedArgument[] array into a string[] array, containing the FramedArgument arguments
	 *
	 * @param detailedArgs Framed arguments
	 *
	 * @returns FramedArgument arguments in a string[] (Command arguments)
	 */
	static simplifyArgs(detailedArgs: FramedArgument[]): string[] {
		const args = detailedArgs.map(element => {
			return element.argument;
		});
		return args;
	}

	/**
	 * Get the command arguments from a string, but with more data attached to each argument string
	 *
	 * @param content Message content
	 * @param settings Argument parse settings
	 *
	 * @returns Command arguments
	 */
	static getDetailedArgs(
		content: string,
		settings?: FramedArgumentOptions
	): FramedArgument[] {
		const args: FramedArgument[] = [];

		// Parse states; for if in a quoted/unquoted section, or is in a codeblock
		let state = ArgumentState.Unquoted;
		let hasCodeBlock = false;

		// What the current argument is
		let argString = "";
		let untrimmedArgString = "";

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
				if (
					!charIsSpace ||
					settings?.quoteSections != undefined ||
					hasCodeBlock
				) {
					if (settings?.quoteSections == QuoteSections.Strict) {
						if (!charIsSpace && !charIsDoubleQuote) {
							return [];
						}
					} else {
						argString += char;
						untrimmedArgString += char;
					}
					// logger.debug(`uq '${argString}'`); // LARGE DEBUG OUTPUT
				} else if (argString.length != 0) {
					// A separator space has been used, so we push our non-empty argument
					// logger.debug(
					// 	`'${char}' <${content}> ${i} Unquoted "${argString}"`
					// ); // LARGE DEBUG OUTPUT
					// Trim argument string, since we're pushing an unquoted argument
					args.push({
						argument: argString.trim(),
						untrimmedArgument: untrimmedArgString,
						wrappedInQuotes: false,
						nonClosedQuoteSection: false,
					});
					argString = "";
					untrimmedArgString = "";
				}
			} else if (state == ArgumentState.Quoted) {
				// If we've just started the quote, but the string isn't empty,
				// push its contents out (carryover from unquoted)
				if (justStartedQuote) {
					// logger.debug(
					// 	`'${char}' <${content}> ${i} JSQ_NonEmpty - CStU: ${changeStateToUnquotedLater} justStartedQuote ${justStartedQuote} - (${ArgumentState[state]}) - "${argString}"`
					// ); // LARGE DEBUG OUTPUT

					if (char == `"` && settings?.showQuoteCharacters) {
						// Fixes edge case where we're just entering quotes now,
						// and we have the setting to put it in
						argString += char;
						untrimmedArgString += char;
					} else if (!hasCodeBlock) {
						if (argString.trim().length != 0) {
							// Since it's been carried over as an unquoted argument
							// And is just finishing in quoted, we can trim it here
							args.push({
								argument: argString.trim(),
								untrimmedArgument: untrimmedArgString,
								wrappedInQuotes: false,
								nonClosedQuoteSection: false,
							});
						}
						argString = "";
						untrimmedArgString = "";
					}
				} else if (
					settings?.showQuoteCharacters ||
					!charIsDoubleQuote ||
					charIsEscaped ||
					hasCodeBlock
				) {
					// If we should be showing quoted characters because of settings,
					// or we're unquoted, or there's an escape if not
					argString += char;
					untrimmedArgString += char;
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

				const nonClosedQuoteSection =
					charIsEnd &&
					argString.length > 0 &&
					settings?.quoteSections == QuoteSections.Strict &&
					!charIsDoubleQuote;

				// Trim if unquoted
				if (state == ArgumentState.Unquoted)
					argString = argString.trim();

				if (settings?.quoteSections == QuoteSections.Strict) {
					if (nonClosedQuoteSection) {
						return [];
					}
				}

				args.push({
					argument: argString,
					untrimmedArgument: untrimmedArgString,
					wrappedInQuotes: state == ArgumentState.Quoted,
					nonClosedQuoteSection: nonClosedQuoteSection,
				});

				argString = "";
				untrimmedArgString = "";
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
	 * Get the arguments, represented as a whole string.
	 * In other words, this gets the contents after the `!command`.
	 *
	 * @param argsToTrim Optional arguments to trim out.
	 *
	 * @returns Contents after the `!command`
	 */
	getArgsContent(argsToTrim?: string[]): string {
		return FramedMessage.getArgsContent(
			this.content,
			argsToTrim,
			this.prefix,
			this.command
		);
	}

	/**
	 * Get the arguments, represented as a whole string.
	 * In other words, this gets the contents after the `!command`.
	 *
	 * @param content Message content
	 * @param argsToTrim Arguments to trim out
	 * @param prefix Message prefix to trim out
	 * @param command Command prefix to trim out
	 *
	 * @returns Contents after the `!command`
	 */
	static getArgsContent(
		content: string,
		argsToTrim?: string[],
		prefix?: string,
		command?: string
	): string {
		let newContent = content;
		if (prefix) newContent = newContent.replace(prefix, "");
		if (command) newContent = newContent.replace(command, "");

		argsToTrim?.forEach(arg => {
			newContent = newContent.replace(arg, "");
		});

		return newContent.trim();
	}

	/**
	 * Parses the emoji and contents of a FramedMessage or string.
	 *
	 * @param msgOrString Framed Message object or string to parse from
	 * @param parseOut String array to parse out. Only needed if prefix
	 * and command are still inside the msg string.
	 */
	static parseEmojiAndString(
		msgOrString: FramedMessage | string,
		parseOut: string[] = []
	):
		| {
				newContent: string;
				newEmote?: string;
		  }
		| undefined {
		let argsContent: string;
		if (msgOrString instanceof FramedMessage) {
			argsContent = msgOrString.getArgsContent([...parseOut]);
			if (argsContent[0] == `"`) {
				argsContent = argsContent.substring(1, argsContent.length);
			}
			if (
				argsContent[argsContent.length - 1] == `"` &&
				argsContent[argsContent.length - 2] != "\\"
			) {
				argsContent = argsContent.substring(0, argsContent.length - 1);
			}
		} else {
			argsContent = msgOrString;
		}

		if (!argsContent) return;

		const newArgs = FramedMessage.getArgs(argsContent);

		// https://stackoverflow.com/questions/62955907/discordjs-nodejs-how-can-i-check-if-a-message-only-contains-custom-emotes#62960102
		const regex = /(:[^:\s]+:|<:[^:\s]+:[0-9]+>|<a:[^:\s]+:[0-9]+>)/g;
		const markdownEmote = newArgs[0].match(regex);
		const genericEmoji = Emoji.unemojify(newArgs[0]).match(regex);

		let newContent = argsContent;
		let newEmote = markdownEmote
			? markdownEmote[0]
			: genericEmoji
			? genericEmoji[0]
			: undefined;
		if (newEmote) {
			newEmote = Emoji.emojify(newEmote);
			newContent = newEmote
				? argsContent.replace(newEmote, "").trimLeft()
				: argsContent;
		}

		// If there is going to be content, return what we got
		if (newContent.length != 0) {
			return {
				newContent,
				newEmote,
			};
		}
	}

	/**
	 * Parses custom $() formatting
	 */
	static async parseCustomFormatting(
		arg: string,
		framedClient: FramedClient
	): Promise<string> {
		// Matches $(test) pattern
		const regex = /(\$\(.*?\))/g;
		const array = [...arg.matchAll(regex)];

		for await (const element of array) {
			// Removes the $()
			const formatArgs = element[0]
				.slice(2, element[0].length - 1)
				.split(" ");
			const formatCommand = formatArgs.shift();

			switch (formatCommand) {
				case "command":
				case "commandnoprefix":
				case "subcommand":
					try {
						const command = formatArgs[0];
						if (command) {
							const baseCommand = framedClient.plugins.getCommand(
								command
							);

							if (!baseCommand) {
								throw new ReferenceError();
							}

							let toReplace = `${baseCommand.defaultPrefix}${baseCommand.id}`;
							if (formatCommand == "commandnoprefix") {
								toReplace = baseCommand.id;
							}

							if (formatCommand != "subcommand") {
								arg = arg.replace(element[0], toReplace);
							} else {
								const clone = [...formatArgs];
								clone.shift();

								let baseSubcommands:
									| BaseSubcommand[]
									| undefined;

								if (clone.length > 0) {
									baseSubcommands = baseCommand.getSubcommandChain(
										clone
									);
								} else {
									// TODO
									// baseSubcommand = framedClient.pluginManager.getSubcommand(command);
								}

								if (!baseSubcommands) {
									throw new ReferenceError();
								}

								let list = "";
								baseSubcommands.forEach(baseSubcommand => {
									list += `${baseSubcommand.id} `;
								});
								list = list.trim();

								toReplace = `${toReplace}${list}`;
								arg = arg.replace(element[0], toReplace);
							}
						} else {
							throw new ReferenceError();
						}
					} catch (error) {
						logger.error(error.stack);
					}

					break;

				default:
					break;
			}
		}

		return arg;
	}
}
