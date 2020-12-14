/* eslint-disable no-mixed-spaces-and-tabs */
import FramedMessage from "back-end/src/structures/FramedMessage";
import { BaseCommand } from "back-end/src/structures/BaseCommand";
import Discord from "discord.js";
import { BasePlugin } from "back-end/src/structures/BasePlugin";
import { emotes, oneOptionMsg, optionEmotes } from "../Fun.plugin";
import { stripIndent } from "common-tags";
import { logger } from "shared";
import EmbedHelper from "back-end/src/utils/discord/EmbedHelper";
import PluginManager from "back-end/src/managers/PluginManager";
import { QuoteSections } from "back-end/src/interfaces/FramedMessageArgsSettings";
import { FramedArgument } from "back-end/src/interfaces/FramedArgument";

export default class Poll extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "poll",
			about: "Create a simple, reaction-based poll through Discord.",
			description: stripIndent`
				Create a simple, reaction-based poll through Discord.
			`,
			usage: '[single] <question> [..."options"]',
			hideUsageInHelp: true,
			examples: stripIndent`
				\`{{prefix}}poll Do you like pineapple on pizza?\` - Simple Poll
				\`{{prefix}}poll Rename \\"Pixel Pete\\"\` - Simple Poll With Quotes at the End
				\`{{prefix}}poll Ban Bim? "Yes" "Sure" "Why Not"\` - Custom Options
				\`{{prefix}}poll single PC or Console? "PC" "Console"\` - Choose One Only
			`,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			const parseResults = await Poll.customParse(msg);
			if (!parseResults) return false;
			const askingForSingle = parseResults.askingForSingle;
			const pollOptionArgs = parseResults.pollOptionArgs;
			const questionContent = parseResults.questionContent;

			// If there some poll options
			if (pollOptionArgs.length >= 1) {
				if (pollOptionArgs.length == 1) {
					await msg.discord.channel.send(
						`${msg.discord.author}, you need at least more than one option!`
					);
					return false;
				}

				// Create the description with results
				const reactionEmotes: string[] = [];
				let description = "";
				let hasCodeBlock = false;

				for (let i = 0; i < pollOptionArgs.length; i++) {
					const element = pollOptionArgs[i];
					hasCodeBlock = element.endsWith("```");
					if (element) {
						const reactionEmote = optionEmotes[i];
						description += `${reactionEmote}  ${element}`;
						// logger.warn(`${i} + 1 = ${newArgs.length}`);
						// If it's not the last element,
						// If there's more than 7 elements
						// If there isn't a codeblock to finish it off
						// Remove the extra new line
						if (i + 1 < pollOptionArgs.length) {
							description += "\n";
							if (
								// Is the amount of options less than 8
								pollOptionArgs.length < 8 &&
								// Is the end of this option not a codeblock
								!hasCodeBlock &&
								// Is this option not the last one
								i + 1 != pollOptionArgs.length
							)
								description += "\n";
						}

						reactionEmotes.push(reactionEmote);
					}
				}

				// Sends and creates the embed
				const embed = new Discord.MessageEmbed()
					.setColor(
						EmbedHelper.getColorWithFallback(msg.discord.guild)
					)
					.setTitle(questionContent)
					.setDescription(
						`${description}${hasCodeBlock ? "" : "\n"}` +
							`\nPoll by ${msg.discord.author}` +
							`\n${askingForSingle ? oneOptionMsg : ""}`
					);
				const newMsg = await msg.discord.channel.send(embed);

				// Does the reactions
				const msgReact: Promise<Discord.MessageReaction>[] = [];
				reactionEmotes.forEach(element => {
					msgReact.push(newMsg.react(element));
				});
				try {
					await Promise.all(msgReact);
				} catch (error) {
					if (error == "Unknown Message") {
						logger.warn(error);
					} else {
						logger.error(error.stack);
					}
				}

				return true;
			} else if (questionContent?.length > 0) {
				// Reacts to a message
				// newMsg obtains a message by either msg.discord.msg, or
				// by getting the message through message ID
				const newMsg = msg.discord.msg
					? msg.discord.msg
					: msg.discord.id
					? msg.discord.channel.messages.cache.get(msg.discord.id)
					: undefined;
				if (newMsg) {
					const msgReact: Promise<Discord.MessageReaction>[] = [];
					if (newMsg) {
						emotes.forEach(element => {
							msgReact.push(newMsg.react(element));
						});
						await Promise.all(msgReact);
					}
				} else {
					// Cannot be called through scripts, as there is no real message to react to
					return false;
				}
			} else {
				await PluginManager.showHelpForCommand(msg);
				return false;
			}
		}
		return true;
	}

	/**
	 * Does a custom parse, specifically for the Poll parameters
	 * @param msg Framed message
	 * @param silent Should the bot send an error?
	 */
	static async customParse(
		msg: FramedMessage,
		silent?: boolean
	): Promise<
		| {
				askingForSingle: boolean;
				singleMultipleOption: string;
				questionContent: string;
				pollOptionArgs: string[];
		  }
		| undefined
	> {
		// Makes sure prefix, command, and args exist
		if (!msg.args || !msg.prefix || !msg.command) {
			if (!silent)
				logger.error(
					`Poll.ts: Important elements (prefix, command, and/or args) not found`
				);
			return;
		}

		let newContent = msg.getArgsContent();
		const newArgs = FramedMessage.getArgs(newContent, {
			quoteSections: QuoteSections.Flexible,
		});

		let singleMultipleOption = "";

		const isSingle = newContent.startsWith("single");
		const isMultiple = newContent.startsWith("multiple");
		const isSingleOrMultiple = isSingle || isMultiple;

		// Removes the single/multiple parma from newContent
		if (isSingleOrMultiple) {
			if (isSingle) {
				singleMultipleOption = "single";
			} else if (isMultiple) {
				singleMultipleOption = "multiple";
			}

			// Handles combined "single question"
			newContent = newContent
				.replace(`${singleMultipleOption} `, ``)
				.replace(singleMultipleOption, "");

			// If there is no content now, the argument was alone before.
			// This means we can remove it from args
			if (newArgs[0].length == 0) {
				newArgs.shift();
			}
		}

		// Attempts to get arguments with a strict quote section mode in mind,
		// while allowing for the question content to contain quotes.
		let detailedArgs: FramedArgument[] = [];
		let elementExtracted: string;
		let questionContent = "";
		let lastElementQuoted = false;
		do {
			detailedArgs = FramedMessage.getDetailedArgs(newContent, {
				quoteSections: QuoteSections.Flexible,
			});

			let failed = false;
			detailedArgs.forEach(arg => {
				// If the argument was closed improperly, or wasn't quoted,
				// the argument hasn't been parsed correctly yet
				if (arg.nonClosedQuoteSection || !arg.wrappedInQuotes) {
					failed = true;
				}
			});

			if (failed) {
				const firstArg = detailedArgs.shift();
				if (firstArg) {
					elementExtracted = firstArg.untrimmedArgument;

					// Re-adds any quotes that were previously parsed out
					let leadingQuote = ``;
					let trailingQuote = ``;
					if (firstArg.wrappedInQuotes) {
						leadingQuote += `"`;
						if (!firstArg.nonClosedQuoteSection) {
							trailingQuote += `"`;
						}
					}
					elementExtracted = `${leadingQuote}${elementExtracted}${trailingQuote}`;

					let extraSpace = "";
					if (lastElementQuoted && firstArg.wrappedInQuotes) {
						extraSpace = " ";
					}
					questionContent += `${extraSpace}${elementExtracted}`;
					newContent = newContent.replace(
						elementExtracted,
						""
					);
					
					lastElementQuoted = firstArg.wrappedInQuotes;
				} else {
					logger.error("Poll.ts: lastArg is undefined, but should have exited earlier!");
					break;
				}
			} else {
				break;
			}
		} while (detailedArgs.length > 0);

		const pollOptionArgs = FramedMessage.simplifyArgs(detailedArgs);

		logger.debug(`singleMultipleOption ${isSingleOrMultiple}`);
		logger.debug(`newArgs: "${newArgs}"`);

		logger.debug(stripIndent`
			new Poll.ts: 
			newContent: '${newContent}'
			questionContent: '${questionContent}'
			newArgs: '${newArgs}'
			singleMultipleOption: '${singleMultipleOption}'
			pollOptionsArgs: [${pollOptionArgs}]
		`);

		return {
			askingForSingle: isSingleOrMultiple,
			singleMultipleOption,
			questionContent,
			pollOptionArgs,
		};
	}
}
