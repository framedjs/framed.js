/* eslint-disable no-mixed-spaces-and-tabs */
import { oneLine } from "common-tags";
import Discord from "discord.js";
import { DiscordMessage } from "../interfaces/DiscordMessage";
import { TwitchMessage } from "../interfaces/TwitchMessage";
import { MessageOptions } from "../interfaces/MessageOptions";
import { ArgumentOptions } from "../interfaces/ArgumentOptions";
import { Argument } from "../interfaces/Argument";
import Emoji from "node-emoji";
import { Client } from "./Client";
import { TwitchMessageOptions } from "../interfaces/TwitchMessageOptions";

enum ArgumentState {
	Quoted,
	Unquoted,
}

export class Message {
	readonly client: Client;

	discord?: DiscordMessage;
	twitch?: TwitchMessage;

	content = "";
	prefix?: string;
	args?: Array<string>;
	command?: string;

	/**
	 * Create a new Framed Message Instance.
	 *
	 * @param options Framed Message Options
	 */
	constructor(options: MessageOptions) {
		// Grabs the base
		const base = options.base;

		let channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel | undefined;
		let id: string | undefined;
		let msg: Discord.Message | undefined;
		let author: Discord.User | undefined;
		let client: Discord.Client | undefined;
		let guild: Discord.Guild | null = null;
		let member: Discord.GuildMember | undefined;

		// Gets the Discord Base for elements such as author, channel, etc.
		// First check for any entries in info.discord.base
		const discordBase = options.discord?.base
			? options.discord.base
			: base?.discord
			? base.discord
			: options.discord;

		const twitchBase: TwitchMessageOptions | undefined = options.twitch
			? options.twitch
			: base?.twitch
			? base.twitch
			: options.twitch;

		if (discordBase) {
			channel = discordBase?.channel;
			id = discordBase?.id;
			msg =
				discordBase instanceof Discord.Message
					? discordBase
					: id && channel
					? channel.messages.cache.get(id)
					: undefined;
			channel = channel ? channel : msg?.channel;
			id = id ? id : msg?.id;

			client = discordBase?.client ? discordBase.client : msg?.client;
			guild = discordBase?.guild ? discordBase?.guild : msg?.guild ? msg.guild : null;
			member = discordBase?.member ? discordBase.member : msg?.member ? msg.member : undefined;
			author = discordBase?.author ? discordBase.author : msg?.author ? member?.user : undefined;

			// Gets client or throws error
			if (!client) {
				throw new ReferenceError(
					oneLine`Parameter discord.client wasn't set when creating Message!
					This value should be set if the discord.msg parameter hasn't been set.`
				);
			}

			// Gets channel or throws error
			if (!channel) {
				throw new ReferenceError(
					oneLine`Parameter discord.channel wasn't set when creating Message!
					This value should be set if the discord.msg parameter hasn't been set.`
				);
			}

			// Gets author or throws error
			if (!author) {
				throw new ReferenceError(oneLine`Parameter discord.author is undefined.`);
			}

			// If there's an msg object, we set all the relevant values here
			this.discord = {
				msg: msg,
				client: client,
				id: id,
				channel: channel,
				author: author,
				member: member,
				guild: guild,
			};
		} else if (twitchBase) {
			const chatClient = twitchBase.chatClient;
			const channel = twitchBase.channel;
			const user = twitchBase.user;

			if (!chatClient) {
				throw new ReferenceError(`Parameter twitch.chatClient`);
			}

			if (!channel) {
				throw new ReferenceError(`Parameter twitch.channel is undefined.`);
			}

			if (!user) {
				throw new ReferenceError(`Parameter twitch.user is undefined.`);
			}

			this.twitch = {
				chatClient: chatClient,
				channel: channel,
				user: user,
			};
		}

		this.client = options.client;

		// Sets the content
		let content = options.content;
		if (!content && id) {
			content = msg?.channel.messages.cache.get(id)?.content;
		}
		if (!content) {
			content = "";
		}
		this.content = content;

		this.prefix = this.getPrefix();
		this.args = this.getArgs();
		this.command = this.getCommand();
	}

	//#region Basic gets for the constructor

	/**
	 * Gets the prefix of the message.
	 */
	private getPrefix(): string | undefined {
		const prefixes = [...this.client.plugins.allPossiblePrefixes];
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
			const args = Message.getArgs(content);
			// Logger.debug(`Args -> ${args}`);
			return args;
		} else {
			return undefined;
		}
	}

	//#endregion

	//#region Arg parsing related functions

	/**
	 * Get the command arguments from a string
	 *
	 * @param content Message content
	 * @param settings Argument parse settings
	 *
	 * @returns Command arguments
	 */
	static getArgs(content: string, settings?: ArgumentOptions): string[] {
		const args = Message.simplifyArgs(Message.getDetailedArgs(content, settings));
		return args;
	}

	/**
	 * Turn Argument[] array into a string[] array, containing the Argument arguments
	 *
	 * @param detailedArgs Framed arguments
	 *
	 * @returns Argument arguments in a string[] (Command arguments)
	 */
	static simplifyArgs(detailedArgs: Argument[]): string[] {
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
	static getDetailedArgs(content: string, settings?: ArgumentOptions): Argument[] {
		const args: Argument[] = [];

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
				if (!charIsSpace || settings?.quoteSections != undefined || hasCodeBlock) {
					if (settings?.quoteSections == "strict") {
						if (!charIsSpace && !charIsDoubleQuote) {
							return [];
						}
					} else {
						argString += char;
						untrimmedArgString += char;
					}
					// Logger.debug(`uq '${argString}'`); // LARGE DEBUG OUTPUT
				} else if (argString.length != 0) {
					// A separator space has been used, so we push our non-empty argument
					// Logger.debug(
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
					// Logger.debug(
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
				} else if (settings?.showQuoteCharacters || !charIsDoubleQuote || charIsEscaped || hasCodeBlock) {
					// If we should be showing quoted characters because of settings,
					// or we're unquoted, or there's an escape if not
					argString += char;
					untrimmedArgString += char;
					// Logger.debug(` q '${argString}'`); // LARGE DEBUG OUTPUT
				}
			}

			// If state change, and the first character isn't a " and just that,
			// or this is the end of the string,
			// push the new argument
			if ((stateChanged && !justStartedQuote) || (charIsEnd && argString.length > 0)) {
				// Is ending off with a quote
				// Logger.debug(
				// 	`'${char}' <${content}> ${i} State change - CStU: ${changeStateToUnquotedLater} justStartedQuote ${justStartedQuote} - (${ArgumentState[state]}) - "${argString}"`
				// ); // LARGE DEBUG OUTPUT

				const nonClosedQuoteSection =
					charIsEnd && argString.length > 0 && settings?.quoteSections == "strict" && !charIsDoubleQuote;

				// Trim if unquoted
				if (state == ArgumentState.Unquoted) argString = argString.trim();

				if (settings?.quoteSections == "strict") {
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
		return Message.getArgsContent(this.content, argsToTrim, this.prefix, this.command);
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
	static getArgsContent(content: string, argsToTrim?: string[], prefix?: string, command?: string): string {
		let newContent = content;
		if (prefix) newContent = newContent.replace(prefix, "");
		if (command) newContent = newContent.replace(command, "");

		argsToTrim?.forEach(arg => {
			newContent = newContent.replace(arg, "");
		});

		return newContent.trim();
	}

	//#endregion

	/**
	 * Parses the emoji and contents of a Message or string.
	 *
	 * @param msgOrString Framed Message object or string to parse from
	 * @param parseOut String array to parse out. Only needed if prefix
	 * and command are still inside the msg string.
	 */
	static parseEmojiAndString(
		msgOrString: Message | string,
		parseOut: string[] = []
	):
		| {
				newContent: string;
				newEmote?: string;
		  }
		| undefined {
		let argsContent: string;
		if (msgOrString instanceof Message) {
			argsContent = msgOrString.getArgsContent([...parseOut]);
			if (argsContent[0] == `"`) {
				argsContent = argsContent.substring(1, argsContent.length);
			}
			if (argsContent[argsContent.length - 1] == `"` && argsContent[argsContent.length - 2] != "\\") {
				argsContent = argsContent.substring(0, argsContent.length - 1);
			}
		} else {
			argsContent = msgOrString;
		}

		if (!argsContent) return;

		const newArgs = Message.getArgs(argsContent);

		// https://stackoverflow.com/questions/62955907/discordjs-nodejs-how-can-i-check-if-a-message-only-contains-custom-emotes#62960102
		const regex = /(:[^:\s]+:|<:[^:\s]+:[0-9]+>|<a:[^:\s]+:[0-9]+>)/g;
		const markdownEmote = newArgs[0].match(regex);
		const genericEmoji = Emoji.unemojify(newArgs[0]).match(regex);

		let newContent = argsContent;
		let newEmote = markdownEmote ? markdownEmote[0] : genericEmoji ? genericEmoji[0] : undefined;
		if (newEmote) {
			newEmote = Emoji.emojify(newEmote);
			newContent = newEmote ? argsContent.replace(newEmote, "").trimLeft() : argsContent;
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
	static async format(arg: string, client: Client): Promise<string> {
		return client.formatting.format(arg);
	}

	/**
	 * Sends a message, regardless of platform.
	 *
	 * @param content
	 */
	async send(content: string): Promise<void> {
		if (this.discord) {
			await this.discord.channel.send(content);
		} else if (this.twitch) {
			this.twitch.chatClient.say(this.twitch.channel, content);
		} else {
			throw new Error("There was no valid platform!");
		}
	}
}
