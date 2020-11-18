/* eslint-disable no-mixed-spaces-and-tabs */
import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { emotes, oneOptionMsg, optionEmotes } from "../shared/Shared";
import Discord from "discord.js";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import { oneLine, stripIndent } from "common-tags";
import * as DiscordUtils from "../../../src/utils/DiscordUtils";
import { logger } from "shared";

export default class Poll extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "poll",
			defaultPrefix: ".",
			name: "Poll",
			about: "Create a simple, reaction-based poll through Discord.",
			description: stripIndent`
				Create a simple, reaction-based poll through Discord.
			`,
			usage: '[single|multiple] <question> ["option 1"] ["option 2"]',
			hideUsageInHelp: true,
			examples: stripIndent`
				Simple Poll: \`{{prefix}}poll Is Tim a Murderer?\`
				Custom Options: \`{{prefix}}poll Is Tim a Murderer? "For Sure" "Absolutely"\`
			`,
			emojiIcon: "👍",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg;

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
						DiscordUtils.getEmbedColorWithFallback(discordMsg)
					)
					.setTitle(questionContent).setDescription(stripIndent`
						${description}${hasCodeBlock ? "" : "\n"}\nPoll by ${discordMsg.author}
						${askingForSingle ? oneOptionMsg : ""}`);
				const newMsg = await discordMsg.channel.send(embed);

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
				const msgReact: Promise<Discord.MessageReaction>[] = [];
				emotes.forEach(element => {
					msgReact.push(discordMsg.react(element));
				});
				await Promise.all(msgReact);
			} else {
				// If the user just tried to do .poll by itself, it'll show a help message
				//
				// NOTE: if the client prefix is different from the help command prefix,
				// the help command code doesn't work, or the parameter gets
				// incorrectly read, this thing *will* break.
				msg.discord.msg.content = `${this.framedClient.defaultPrefix}help ${this.id}`;
				const newMsg = new FramedMessage(
					msg.discord.msg,
					msg.framedClient
				);
				await msg.framedClient.pluginManager.runCommand(newMsg);
			}
		}
		return true;
	}

	static async customParse(
		msg: FramedMessage,
		silent?: boolean
	): Promise<
		| {
				askingForSingle: boolean;
				singleMultipleOption: string;
				questionContent: string;
				questionArgs: string[];
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

		// If a user quotes the beginning question,
		// this causes the question content value be empty.
		// We shift it back to as if it was never an "option",
		// but rather the question itself
		if (questionContent == "") {
			const shiftedArgs = pollOptionArgs.shift();
			if (shiftedArgs) {
				questionContent = shiftedArgs;
			}
		}

		// Potentially parses out a number at the beginning of the question
		const questionArgs = FramedMessage.getArgs(questionContent);
		const singleMultipleOption = questionArgs[0];
		logger.debug(stripIndent`
			Poll.ts: 
			singleMultipleOption: ${singleMultipleOption}
			questionArgs: [${questionArgs}]
			pollOptionsArgs: [${pollOptionArgs}]
			questionContentNotSplit: '${contentNotSplit}'
			questionContent: '${questionContent}'
		`);

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

		// If it can confirm this is a number, and hasn't been escaped by quotes

		// Is the option valid?
		const optionLowerCase = singleMultipleOption?.toLocaleLowerCase();
		const askingForSingle =
			optionLowerCase == "single" || optionLowerCase == "singl";
		const askingForMultiple =
			optionLowerCase == "multiple" ||
			optionLowerCase == "multi" ||
			optionLowerCase == "mult";

		if (askingForSingle || askingForMultiple) {
			// Since the option is valid, the mention is not part of the question.
			// Therefore, it gets removed
			questionArgs.splice(0, 1);
			questionContent = questionContent
				.replace(singleMultipleOption, "")
				.trim();
			logger.debug(stripIndent`
				Poll.ts: Detected single/multiple flag!
				new questionArgs: [${questionArgs}]
				new questionContent: "${questionContent}"
				replaced w/ "${singleMultipleOption}"
				`);
		}

		return {
			askingForSingle,
			singleMultipleOption,
			questionContent,
			questionArgs,
			pollOptionArgs,
		};
	}
}
