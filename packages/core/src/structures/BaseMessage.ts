import type { Argument } from "../interfaces/Argument";
import type { ArgumentOptions } from "../interfaces/ArgumentOptions";
import type { DiscordMessageData } from "../interfaces/DiscordMessageData";
import type { DiscordInteractionData } from "../interfaces/DiscordInteractionData";
import type { TwitchMessageData } from "../interfaces/TwitchMessageData";
import type { MessageOptions } from "../interfaces/MessageOptions";
import type { Place } from "../interfaces/Place";
import type { Platform } from "../types/Platform";

import { Base } from "./Base";
import { Client } from "./Client";
import { Logger } from "@framedjs/logger";

import { FriendlyError } from "./errors/FriendlyError";

import Discord from "discord.js";
import EmojiRegex from "emoji-regex/RGI_Emoji";
import Emoji from "node-emoji";

enum ArgumentState {
	Quoted,
	Unquoted,
}

export class BaseMessage extends Base {
	/** What platform the message came from */
	platform: Platform;

	discord?: DiscordMessageData;
	discordInteraction?: DiscordInteractionData;
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

		// Sets the platform to a default (none)
		this.platform = "none";

		// Sets the content
		this.content = options.content ?? "";
	}

	//#region Basic gets for the constructor

	/**
	 * Elements includes prefix, args, and command.
	 *
	 * @param place Place data
	 * @param guild Discord Guild, for the role prefix
	 */
	async getMessageElements(
		place?: Place | null,
		guild?: Discord.Guild | null
	): Promise<{
		prefix: string | undefined;
		args: string[] | undefined;
		command: string;
	}> {
		place = place ?? (await this.getPlace());

		this.prefix =
			this.discordInteraction != null
				? "/"
				: this.getPrefix(place, guild);
		this.args = this.getArgs();
		this.command = this.getCommand() ?? "";

		return { prefix: this.prefix, args: this.args, command: this.command };
	}

	/**
	 * Gets the prefix of the message.
	 *
	 * @param place Place data
	 * @param guild Discord Guild, for the role prefix
	 *
	 * @returns prefix
	 */
	private getPrefix(
		place: Place,
		guild?: Discord.Guild | null
	): string | undefined {
		// Gets the prefixes and sorts them from longest to shortest
		// This is so if there are multiple matching prefixes,
		// the longest one of them all should be checked first.
		const prefixes = this.client.commands
			.getPossiblePrefixes(place, guild)
			.sort((a, b) => b.length - a.length);

		// Finds a matching prefix and returns it
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
		// Discord slash command specific code
		if (this.discordInteraction) {
			const interaction = this.discordInteraction.interaction;
			if (interaction.isCommand()) return interaction.commandName;
			return;
		}

		// Gets the first arg from args, and sets it to all lowercase
		let command = this.args?.shift()?.toLocaleLowerCase();

		// Normally, args don't split on \n so we do that here
		if (command != undefined) {
			command = command.split("\n")[0];
		}

		// If there was a prefix, and there was args, we can
		return this.prefix != undefined && this.args ? command : undefined;
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
		if (this.prefix != undefined && !this.discordInteraction) {
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
		let argumentState = ArgumentState.Unquoted;
		let hasCodeBlock = false;

		// What the current argument is
		let argString = "";
		let untrimmedArgString = "";

		const leftDoubleQuote = "“";
		const rightDoubleQuote = "”";

		let previousQuoteChar = "";

		for (let i = 0; i < content.length; i++) {
			const char = content[i];

			// Character comparisons
			let charIsQuote =
				char == `"` ||
				char == leftDoubleQuote ||
				char == rightDoubleQuote;
			const charIsSpace = char == " ";
			const charIsBackTick = char == "`";

			// Special character comparisons
			const charIsEscaped = content[i - 1] == "\\";
			const charIsEnd = i + 1 == content.length;

			// Quote character consistency for iPhone quotes
			if (
				char == leftDoubleQuote &&
				previousQuoteChar.length > 0 &&
				previousQuoteChar != rightDoubleQuote
			) {
				charIsQuote = false;
			}

			if (
				char == rightDoubleQuote &&
				previousQuoteChar.length > 0 &&
				previousQuoteChar != leftDoubleQuote
			) {
				charIsQuote = false;
			}

			if (
				// Should not start with a right double quote
				char == rightDoubleQuote &&
				previousQuoteChar.length == 0
			) {
				charIsQuote = false;
			}

			// Quote character consistency for normal " chars
			if (
				char == `"` &&
				previousQuoteChar.length > 0 &&
				previousQuoteChar != char
			) {
				charIsQuote = false;
			}

			// hasCodeBlock will be true when the message has codeblocks
			if (charIsBackTick) hasCodeBlock = !hasCodeBlock;

			// Check for state change
			let argumentStateChanged = false;
			let changeStateToUnquotedLater = false;
			let justStartedWrapper = false;

			// Inline functions
			const addToArgStrings = function addToArgStrings() {
				argString += char;
				untrimmedArgString += char;
			};

			const clearArgStrings = function clearArgStrings() {
				argString = "";
				untrimmedArgString = "";
				previousQuoteChar = "";
			};

			const pushArgStrings = function pushArgStrings(
				argument: string,
				wrappedInQuotes = false,
				nonClosedQuoteSection = false
			) {
				args.push({
					argument: argument,
					untrimmedArgument: untrimmedArgString,
					wrappedInQuotes: wrappedInQuotes,
					nonClosedQuoteSection: nonClosedQuoteSection,
				});
			};

			// If there was a " to close off a quote section
			// and the character hasn't been escaped by a \ or `
			if (charIsQuote && !(charIsEscaped || hasCodeBlock)) {
				argumentStateChanged = true;

				switch (argumentState) {
					case ArgumentState.Quoted:
						// NOTE: we don't unquote it back immediately, so we
						// can process the last " character
						changeStateToUnquotedLater = true;
						// state = ArgumentState.Unquoted
						break;
					case ArgumentState.Unquoted:
						argumentState = ArgumentState.Quoted;
						justStartedWrapper = true;
						break;
				}
			}

			if (argumentState == ArgumentState.Unquoted) {
				// If we're unquoted, split with spaces if settings allow it
				// We'll process excess spaces later
				if (
					!charIsSpace ||
					settings?.quoteSections != undefined ||
					hasCodeBlock
				) {
					if (settings?.quoteSections == "strict") {
						if (!charIsSpace && !charIsQuote) {
							return [];
						}
					} else {
						addToArgStrings();
					}
					// Logger.debug(`uq '${argString}'`); // LARGE DEBUG OUTPUT
				} else if (argString.length != 0) {
					// A separator space has been used, so we push our non-empty argument

					// Trim argument string, since we're pushing an unquoted argument
					pushArgStrings(argString.trim());
					clearArgStrings();
				}
			} else if (argumentState == ArgumentState.Quoted) {
				// If we've just started the quote, but the string isn't empty,
				// push its contents out (carryover from unquoted)
				if (justStartedWrapper) {
					if (charIsQuote && settings?.showQuoteCharacters) {
						// Fixes edge case where we're just entering quotes now,
						// and we have the setting to put it in
						argString += char;
						untrimmedArgString += char;
					} else if (!hasCodeBlock) {
						if (argString.trim().length != 0) {
							// Since it's been carried over as an unquoted argument
							// And is just finishing in quoted, we can trim it here
							pushArgStrings(argString.trim());
						}
						clearArgStrings();
					}
				} else if (
					settings?.showQuoteCharacters ||
					!charIsQuote ||
					charIsEscaped ||
					hasCodeBlock
				) {
					// If we should be showing quoted characters because of settings,
					// or we're unquoted, or there's an escape if not
					addToArgStrings();
				}
			}

			if (
				// If the argument state changed, and the first char
				// isn't a quote and just that
				(argumentStateChanged && !justStartedWrapper) ||
				// Or, this is the end of the strong, and there's arguments to push,
				(charIsEnd && argString.length > 0)
				// Push the new args
			) {
				const nonClosedQuoteSection =
					charIsEnd &&
					argString.length > 0 &&
					settings?.quoteSections == "strict" &&
					!charIsQuote;

				// Trim if unquoted
				if (argumentState == ArgumentState.Unquoted)
					argString = argString.trim();

				if (settings?.quoteSections == "strict") {
					if (nonClosedQuoteSection) {
						return [];
					}
				}

				pushArgStrings(
					argString,
					argumentState == ArgumentState.Quoted,
					nonClosedQuoteSection
				);
				clearArgStrings();
			}

			// Sets the previous quote char
			if (charIsQuote) {
				previousQuoteChar = char;
			}

			// Finally changes the state to the proper one
			// We don't do this for quotes because we need to process putting the quote chars in or not
			if (changeStateToUnquotedLater) {
				argumentState = ArgumentState.Unquoted;
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

	//#region Place functions
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
		const place = client.provider.places.get(platformId);
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

		const channelData =
			await client.twitch.api.helix.channels.getChannelInfo(channel);

		const platformDefault = "twitch_default";
		const platformId = channelData?.id ?? platformDefault;
		const place = client.provider.places.get(platformId);
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
		await client.provider.places.set(
			platformId,
			platform,
			newId ?? (await client.provider.places.generateIdAsync())
		);
		const place = client.provider.places.get(platformId);
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
			case "discordInteraction":
				place = {
					id: "default",
					platform: "discordInteraction",
				};
				break;
			default:
				// For an unknown platform: this should NEVER happen,
				// but just in case, use "default" as the ID, and platform being "none"
				try {
					throw new Error(
						`Platform is ${this.platform}, but there's no existing data for it`
					);
				} catch (error) {
					Logger.error((error as Error).stack);
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
	//#endregion

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
		const genericEmoji = newArgs[0].match(EmojiRegex());

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
		} else if (this.discordInteraction) {
			if (
				this.discordInteraction.interaction.isButton() ||
				this.discordInteraction.interaction.isCommand() ||
				this.discordInteraction.interaction.isContextMenu() ||
				this.discordInteraction.interaction.isMessageComponent() ||
				this.discordInteraction.interaction.isSelectMenu()
			) {
				await this.discordInteraction.interaction.reply({
					content: content,
				});
			} else {
				throw new Error("Interaction does not have a reply function");
			}
		} else if (this.twitch) {
			this.twitch.chat.say(this.twitch.channel, content);
		} else {
			throw new Error("There was no valid platform!");
		}
	}

	/**
	 * Sends a message showing help for a command. This is a function shortcut to {@link CommandManger}.
	 *
	 * @param place Place
	 *
	 * @returns boolean value `true` if help is shown.
	 */
	async sendHelpForCommand(): Promise<boolean> {
		return this.client.commands.sendHelpForCommand(this);
	}

	/**
	 * Sends error message. This is a function shortcut to {@link CommandManger}.
	 *
	 * @param friendlyError
	 * @param commandId Command ID for EmbedHelper.getTemplate
	 */
	async sendErrorMessage(
		friendlyError: FriendlyError,
		commandId?: string
	): Promise<void> {
		return this.client.commands.sendErrorMessage(
			this,
			friendlyError,
			commandId
		);
	}
}
