/* eslint-disable no-mixed-spaces-and-tabs */
import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import Discord from "discord.js";
import { BasePlugin } from "../../../src/structures/BasePlugin";
import { emotes, oneOptionMsg, optionEmotes } from "../Fun.plugin";
import { oneLine, stripIndent } from "common-tags";
import { logger } from "shared";
import EmbedHelper from "../../../src/utils/discord/EmbedHelper";

export default class Poll extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "poll",
			defaultPrefix: ".",
			about: "Create a simple, reaction-based poll through Discord.",
			description: stripIndent`
				Create a simple, reaction-based poll through Discord.
			`,
			usage: '[single|multiple] <question> ["option 1"] ["option 2"]',
			hideUsageInHelp: true,
			examples: stripIndent`
				\`{{prefix}}poll Do you like Pineapple on Pizza?\` - Simple Poll
				\`{{prefix}}poll Ban Bim? "Yes" "Sure" "Why Not"\` - Custom Options
				\`{{prefix}}poll single PC or Console? "PC" "Console"\` - Single Option
			`,
			emojiIcon: "👍",
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
						EmbedHelper.getEmbedColorWithFallback(msg.discord.guild)
					)
					.setTitle(questionContent).setDescription(stripIndent`
						${description}${hasCodeBlock ? "" : "\n"}\nPoll by ${msg.discord.author}
						${askingForSingle ? oneOptionMsg : ""}`);
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
			} else if (questionContent.length > 0) {
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
				// If the user just tried to do .poll by itself, it'll show a help message
				//
				// NOTE: if the client prefix is different from the help command prefix,
				// the help command code doesn't work, or the parameter gets
				// incorrectly read, this thing *will* break.
				const newMsg = new FramedMessage({
					framedClient: this.framedClient,
					discord: {
						client: msg.discord.client,
						channel: msg.discord.channel,
						content: `${this.framedClient.defaultPrefix}help ${this.id}`,
						author: msg.discord.author,
						guild: msg.discord.guild,
					},
				});
				await msg.framedClient.pluginManager.runCommand(newMsg);
				logger.debug("Poll.ts: Sent help command");
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

		const contentNotSplit = msg.content
			.replace(msg.prefix, "")
			.replace(msg.command, "")
			.trim();
		let questionContent = contentNotSplit.split(`"`)[0];
		const optionsContent = msg.content
			.replace(msg.prefix, "")
			.replace(msg.command, "")
			.replace(questionContent, "")
			.trim();
		const pollOptionArgs = FramedMessage.trimArgs(
			FramedMessage.getArgs(optionsContent)
		);

		// First, we parse out the beginning single or multiple, out of question content
		const singleMultipleOption = questionContent
			.split(" ")[0]
			.toLocaleLowerCase();
		const isSingle = singleMultipleOption == "single";
		const isMultiple = singleMultipleOption == "multiple";

		// Potentially removes "single" or "multiple" from the content
		if (isSingle || isMultiple) {
			// Since the option is valid, the mention is not part of the question.
			// Therefore, it gets removed
			questionContent = questionContent
				.replace(singleMultipleOption, "")
				.trim();
			logger.debug(stripIndent`
				Poll.ts: Detected single/multiple flag!
				New questionContent: "${questionContent}"
				Replaced the "${singleMultipleOption}" out of the string.
				`);
		}

		// If a user quotes the beginning question,
		// this causes the question content value be empty.
		// We shift it back to as if it was never an "option",
		// but rather the question itself
		if (questionContent == "") {
			const shifted = pollOptionArgs.shift();
			logger.debug("a");
			if (shifted) {
				logger.debug("Replaced question content");
				questionContent = shifted;
			}
		}

		// Does some checks to see if the amount of options is correct
		const discordMsg = msg.discord?.msg;
		const min = 1;
		const max = 20;
		if (pollOptionArgs.length > max) {
			if (discordMsg && !silent)
				await discordMsg.reply(oneLine`
						there are too many options! The max number of options is 
						${max} due to the Discord reaction limit.
					`);
			return;
		} else if (pollOptionArgs.length <= min && pollOptionArgs.length != 0) {
			// != 0 exclusion exists to make sure that there's an
			// option to have no options, and just create a simple poll
			if (discordMsg && !silent)
				await discordMsg.reply(oneLine`
						there needs to be at least more than 1 option!
					`);
			return;
		}

		logger.debug(stripIndent`
			Poll.ts: 
			singleMultipleOption: ${singleMultipleOption}
			pollOptionsArgs: [${pollOptionArgs}]
			questionContentNotSplit: '${contentNotSplit}'
			questionContent: '${questionContent}'
		`);

		return {
			askingForSingle: isSingle,
			singleMultipleOption,
			questionContent,
			pollOptionArgs,
		};
	}
}
