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
			about: "Create a simple, reaction-based poll through Discord.",
			description: stripIndent`
				Create a simple, reaction-based poll through Discord.
			`,
			usage: '[single] <question> ["option 1"] ["option 2"]',
			hideUsageInHelp: true,
			examples: stripIndent`
				\`{{prefix}}poll Do you like pineapple on pizza?\` - Simple Poll
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

		const newContent = msg.content
			.replace(msg.prefix, "")
			.replace(msg.command, "")
			.trim();
		const newArgs = FramedMessage.getArgs(newContent, {
			separateByQuoteSections: true,
		});

		logger.debug(stripIndent`
			new Poll.ts: 
			newContent: '${newContent}'
			newArgs: '${newArgs}'`);

		// Handles getting new content
		// NOTE: isSingleOrMultiple will be false, if there's quotes cancelling this param out
		let singleMultipleOption = "";
		let questionContent = newArgs[0];

		const isSingle = newContent.startsWith("single");
		const isMultiple = newContent.startsWith("multiple");
		const isSingleOrMultiple = isSingle || isMultiple;

		if (isSingleOrMultiple) {
			if (isSingle) {
				singleMultipleOption = "single";
			} else if (isMultiple) {
				singleMultipleOption = "multiple";
			}

			// Handles combined "single question"
			questionContent = questionContent
				.replace(`${singleMultipleOption} `, ``)
				.replace(singleMultipleOption, "");

			// If there is no content now, the argument was alone before.
			// This means we can remove it from args
			if (questionContent.length == 0) {
				newArgs.shift();
				questionContent = newArgs[0];
			}
		}

		logger.debug(`singleMultipleOption ${isSingleOrMultiple}`);
		logger.debug(`newArgs: "${newArgs}"`);

		const pollOptionArgs = newArgs.slice(1, newArgs.length);

		logger.debug(stripIndent`
			new Poll.ts: 
			newContent: '${newContent}'
			newArgs: '${newArgs}'
			singleMultipleOption: '${singleMultipleOption}'
			questionContent: '${questionContent}'
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
