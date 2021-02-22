/* eslint-disable no-mixed-spaces-and-tabs */
import { oneLine, oneLineInlineLists } from "common-tags";

import { Argument } from "../interfaces/Argument";
import { ArgumentOptions } from "../interfaces/ArgumentOptions";
import { DiscordMessageData } from "../interfaces/DiscordMessageData";
import { TwitchMessageData } from "../interfaces/TwitchMessageData";
import { MessageOptions } from "../interfaces/MessageOptions";
import { Place } from "../interfaces/Place";

import { Base } from "./Base";
import { Client } from "./Client";
import { Platform } from "../types/Platform";
import { Logger } from "@framedjs/logger";

import { FriendlyError } from "./errors/FriendlyError";
import { EmbedHelper } from "../utils/discord/EmbedHelper";

import Discord from "discord.js";
import Emoji from "node-emoji";

enum ArgumentState {
	Quoted,
	Unquoted,
}

export class BaseMessage extends Base {
	/** What platform the message came from */
	platform: Platform;

	discord?: DiscordMessageData;
	twitch?: TwitchMessageData;

	content = "";
	prefix?: string;
	args?: Array<string>;
	command?: string;

	private place?: Place;
	private placeTryNonDefaultId?: Place;

	/**
	 * Create a new Framed Message Instance.
	 *
	 * @param options Framed Message Options
	 */
	constructor(options: MessageOptions) {
		super(options.client);

		// Grabs the base of a possible message
		const base = options.base;

		let channel:
			| Discord.TextChannel
			| Discord.DMChannel
			| Discord.NewsChannel
			| undefined;
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

		const twitchBase = options.twitch
			? options.twitch
			: base?.twitch
			? base.twitch
			: options.twitch;

		if (discordBase) {
			this.platform = "discord";
			channel = discordBase?.channel;
			id = discordBase?.id;
			msg =
				discordBase instanceof Discord.Message
					? discordBase
					: id && channel
					? channel.messages.cache.get(id)
					: undefined;
			channel = channel ?? msg?.channel;
			id = id ?? msg?.id;

			client = discordBase?.client ?? msg?.client;
			guild = discordBase?.guild
				? discordBase?.guild
				: msg?.guild
				? msg.guild
				: null;
			member = discordBase?.member
				? discordBase.member
				: msg?.member
				? msg.member
				: undefined;
			author = discordBase?.author
				? discordBase.author
				: msg?.author
				? member?.user
				: undefined;

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
				throw new ReferenceError(
					oneLine`Parameter discord.author is undefined.`
				);
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
			this.platform = "twitch";
			const api = this.client.twitch.api;
			const chat = twitchBase.chat;
			const channel = twitchBase.channel;
			const user = twitchBase.user;

			if (!api) {
				throw new ReferenceError(`Parameter twitch.api is undefined.`);
			}

			if (!chat) {
				throw new ReferenceError(
					`Parameter twitch.chatClient is undefined.`
				);
			}

			if (!channel) {
				throw new ReferenceError(
					`Parameter twitch.channel is undefined.`
				);
			}

			if (!user) {
				throw new ReferenceError(`Parameter twitch.user is undefined.`);
			}

			this.twitch = {
				api: api,
				chat: chat,
				channel: channel,
				user: user,
			};
		} else {
			this.platform = "none";
		}

		// Sets the content
		let content = options.content;
		if (!content && id) {
			content = msg?.channel.messages.cache.get(id)?.content;

			// If for some reason the cache doesn't contain anything,
			// Fallback to msg.content
			if (!content) {
				content = msg?.content;
			}
		}
		if (!content) {
			content = "";
		}
		this.content = content;
	}

	//#region Basic gets for the constructor

	/**
	 * Elements includes prefix, args, and command.
	 */
	async getMessageElements(
		place?: Place
	): Promise<{
		prefix: string | undefined;
		args: string[] | undefined;
		command: string | undefined;
	}> {
		place = place ?? (await this.getPlace());

		this.prefix = this.getPrefix(place);
		this.args = this.getArgs();
		this.command = this.getCommand();

		return { prefix: this.prefix, args: this.args, command: this.command };
	}

	/**
	 * Gets the prefix of the message.
	 *
	 * @param place Place data
	 *
	 * @returns prefix
	 */
	private getPrefix(place: Place): string | undefined {
		const prefixes = this.client.commands.getPossiblePrefixes(place);
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
			const args = BaseMessage.getArgs(content);
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
		const args = BaseMessage.simplifyArgs(
			BaseMessage.getDetailedArgs(content, settings)
		);
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
	static getDetailedArgs(
		content: string,
		settings?: ArgumentOptions
	): Argument[] {
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
				if (
					!charIsSpace ||
					settings?.quoteSections != undefined ||
					hasCodeBlock
				) {
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
					// Logger.debug(` q '${argString}'`); // LARGE DEBUG OUTPUT
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
				// Logger.debug(
				// 	`'${char}' <${content}> ${i} State change - CStU: ${changeStateToUnquotedLater} justStartedQuote ${justStartedQuote} - (${ArgumentState[state]}) - "${argString}"`
				// ); // LARGE DEBUG OUTPUT

				const nonClosedQuoteSection =
					charIsEnd &&
					argString.length > 0 &&
					settings?.quoteSections == "strict" &&
					!charIsDoubleQuote;

				// Trim if unquoted
				if (state == ArgumentState.Unquoted)
					argString = argString.trim();

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
		return BaseMessage.getArgsContent(
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

	//#endregion

	/**
	 * Gets the place data, using Discord data.
	 *
	 * @param client Framed client
	 * @param guild Discord Guild
	 */
	static async discordGetPlace(
		client: Client,
		guild: Discord.Guild | null | undefined,
		createNewPlace = false
	): Promise<Place> {
		const platformDefault = "discord_default";
		const platformId = guild?.id ?? platformDefault;
		const place = client.provider.place.get(platformId);
		if (!place) {
			if (!createNewPlace) {
				return {
					id: platformDefault,
					platform: "discord",
				};
			} else {
				if (platformId == platformDefault) {
					throw new ReferenceError(
						`place with ID ${platformId} should have already existed!`
					);
				}
				return BaseMessage.createPlace(client, platformId, "discord");
			}
		}
		return place;
	}

	/**
	 *
	 * @param client
	 */
	static async twitchGetPlace(
		client: Client,
		channel: string,
		createNewPlace = false
	): Promise<Place> {
		if (!client.twitch) {
			throw new ReferenceError("client.twitch is undefined");
		}
		if (!client.twitch.api) {
			throw new ReferenceError("client.twitch.api is undefined");
		}

		const channelData = await client.twitch.api.helix.channels.getChannelInfo(
			channel
		);

		const platformDefault = "twitch_default";
		const platformId = channelData?.id ?? platformDefault;
		const place = client.provider.place.get(platformId);
		if (!place) {
			if (!createNewPlace) {
				return {
					id: platformDefault,
					platform: "twitch",
				};
			} else {
				if (platformId == platformDefault) {
					throw new ReferenceError(
						`place with ID ${platformId} should have already existed!`
					);
				}
				return BaseMessage.createPlace(client, platformId, "twitch");
			}
		}
		return place;
	}

	/**
	 *
	 * @param client
	 * @param platformId
	 * @param platform
	 * @param newId
	 */
	static async createPlace(
		client: Client,
		platformId: string,
		platform: Platform,
		newId?: string
	): Promise<Place> {
		await client.provider.place.set(
			platformId,
			platform,
			newId ?? (await client.provider.place.generateIdAsync())
		);
		const place = client.provider.place.get(platformId);
		if (!place) {
			throw new Error(`Failed to create new place and retrieve it`);
		}
		return place;
	}

	/**
	 * Gets the guild or Twitch ID. If it can't be found, this function will fallback to returning
	 * "twitch_default" or "discord_default". If things go very wrong, this function might also return "default".
	 *
	 * @param createNewPlaceIfNone Creates a new place, if there's no specific place entry.
	 * @param forceNoCache Forces to not use the Message's cache for the place data.
	 */
	async getPlace(
		createNewPlaceIfNone = false,
		forceNoCache = false
	): Promise<Place> {
		// If the result is cached, and we're not forced to not use the cache, use that instead.

		if (!forceNoCache) {
			if (this.place && !createNewPlaceIfNone) {
				return this.place;
			} else if (this.placeTryNonDefaultId && createNewPlaceIfNone) {
				return this.placeTryNonDefaultId;
			}
		}

		// Attempts to retrieve the place data per platform
		let place: Place;
		switch (this.platform) {
			case "discord":
				if (this.discord) {
					place = await BaseMessage.discordGetPlace(
						this.client,
						this.discord.guild,
						createNewPlaceIfNone
					);
				} else {
					throw new Error(
						`Platform is ${this.platform}, but there's no existing data for it`
					);
				}
				break;
			case "twitch":
				if (this.twitch) {
					place = await BaseMessage.twitchGetPlace(
						this.client,
						this.twitch.channel,
						createNewPlaceIfNone
					);
				} else {
					throw new Error(
						`Platform is ${this.platform}, but there's no existing data for it`
					);
				}
				break;
			default:
				// For an unknown platform: this should NEVER happen,
				// but just in case, use "default" as the ID, and platform being "none"
				try {
					throw new Error(
						`Platform is ${this.platform}, but there's no existing data for it`
					);
				} catch (error) {
					Logger.error(error.stack);
				}

				Logger.warn('Attempting to use the fallback "default" instead');
				place = {
					id: "default",
					platform: "none",
				};
				break;
		}

		// Caching
		this.place = place;

		// Returns the result
		return place;
	}

	/**
	 * Parses the emoji and contents of a Message or string.
	 *
	 * @param msgOrString Framed Message object or string to parse from
	 * @param parseOut String array to parse out. Only needed if prefix
	 * and command are still inside the msg string.
	 */
	static parseEmojiAndString(
		msgOrString: BaseMessage | string,
		parseOut: string[] = []
	): {
		newContent: string;
		newEmote?: string;
	} {
		let argsContent = "";
		if (msgOrString instanceof BaseMessage) {
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

		const newArgs = BaseMessage.getArgs(argsContent);

		// https://stackoverflow.com/questions/62955907/discordjs-nodejs-how-can-i-check-if-a-message-only-contains-custom-emotes#62960102
		const regex = /(:[^:\s]+:|<:[^:\s]+:[\d]+>|<a:[^:\s]+:[0-9]+>)+$/g;
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

		return {
			newContent,
			newEmote,
		};
	}

	/**
	 * Parses custom $() formatting
	 */
	static async format(
		arg: string,
		client: Client,
		place: Place
	): Promise<string> {
		return client.formatting.format(arg, place);
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
			this.twitch.chat.say(this.twitch.channel, content);
		} else {
			throw new Error("There was no valid platform!");
		}
	}

	/**
	 * Sends a message showing help for a command.
	 *
	 * @param msg Framed Message containing command that needs to be shown help for
	 *
	 * @returns boolean value `true` if help is shown.
	 */
	async sendHelpForCommand(place?: Place): Promise<boolean> {
		const pluginManager = this.client.plugins;

		const helpPrefix = pluginManager.map
			.get("default.bot.info")
			?.commands.get("help")
			?.getDefaultPrefix(place ?? (await this.getPlace()));

		const content = oneLineInlineLists`${helpPrefix ?? this.prefix}help ${
			this.command
		} ${this.args ?? ""}`;

		if (this.discord) {
			const newMsg = new BaseMessage({
				client: this.client,
				content: content,
				discord: {
					client: this.discord.client,
					channel: this.discord.channel,
					author: this.discord.author,
					guild: this.discord.guild,
				},
			});
			await newMsg.getMessageElements();
			try {
				const success = await this.client.commands.run(newMsg);
				if (success) {
					return true;
				} else {
					throw new Error("Help command execution didn't succeed");
				}
			} catch (error) {
				Logger.error(error.stack);
			}

			return false;
		} else if (this.twitch) {
			const newMsg = new BaseMessage({
				client: this.client,
				content: content,
				twitch: {
					chat: this.twitch.chat,
					channel: this.twitch.channel,
					user: this.twitch.user,
				},
			});
			await newMsg.getMessageElements();
			try {
				const success = await this.client.commands.run(newMsg);
				if (success) {
					return true;
				} else {
					throw new Error("Help command execution didn't succeed");
				}
			} catch (error) {
				Logger.error(error.stack);
			}

			return false;
		}

		return false;
	}

	/**
	 * Sends error message
	 *
	 * @param friendlyError
	 * @param commandId Command ID for EmbedHelper.getTemplate
	 */
	async sendErrorMessage(
		friendlyError: FriendlyError,
		commandId?: string
	): Promise<void> {
		if (this.discord) {
			const embed = EmbedHelper.getTemplate(
				this.discord,
				await EmbedHelper.getCheckOutFooter(this, commandId)
			)
				.setTitle(friendlyError.friendlyName)
				.setDescription(friendlyError.message);

			await this.discord.channel.send(embed);
		} else {
			await this.send(
				`${friendlyError.friendlyName}: ${friendlyError.message}`
			);
		}
	}
}
