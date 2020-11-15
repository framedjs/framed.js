import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { emotes, optionEmotes } from "../shared/Shared";
import Discord from "discord.js";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import { oneLine, stripIndent } from "common-tags";
import * as DiscordUtils from "../../../src/utils/DiscordUtils";
import { logger } from "shared";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "poll",
			defaultPrefix: ".",
			name: "Poll",
			about: "Create a simple, reaction-based poll through Discord.",
			description: stripIndent`
				Create a simple, reaction-based poll through Discord.
			`,
			usage: '[# of options] <question> ["option 1"] ["option 2"]',
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
			const regex = msg.content.match(/"/g);
			const min = 1;
			const max = 20;

			if (!msg.args || !msg.prefix || !msg.command)
				return false;

			// If quotes have happened more than twice
			if ((regex || []).length >= 2 && msg.prefix && msg.command) {
				// Gets the argument between the command and the quoted options
				// TODO
				let unquotedContent = msg.content
					.replace(msg.prefix, "")
					.replace(msg.command, "")
					.trim()
					.split(`"`)[0];
				const optionsContent = msg.content
					.replace(msg.prefix, "")
					.replace(msg.command, "")
					.replace(unquotedContent, "")
					.trim();
				const newArgs = FramedMessage.trimArgs(FramedMessage.getArgs(optionsContent));

				// If a user quotes the beginning question,
				// this causes the unquoted content value be empty.
				// We shift it back to as if it was never an "option", 
				// but rather the question itself
				if (unquotedContent == "") {
					const shiftedArgs = newArgs.shift();
					if (shiftedArgs) {
						unquotedContent = shiftedArgs;
					}
				}

				// Potentially parses out a number at the beginning of the question
				const questionArgs = FramedMessage.getArgs(unquotedContent);
				const optionsNum = Number(questionArgs[0]);

				// If it can confirm this is a number, and hasn't been escaped by quotes
				if (!Number.isNaN(optionsNum) && unquotedContent[0] != `"`) {
					if (optionsNum < min || optionsNum > max) {
						discordMsg.reply(`Please make sure that the options number is between ${min} and ${max}!`);
					}
				}

				logger.debug(`newArgs = ${newArgs}`);

				// Does some checks to see if the amount of options is correct
				if (newArgs.length > max) {
					await discordMsg.reply(oneLine`
						Too many options! The max number of options is 20 due to the Discord reaction limit.
					`);
					return false;
				} else if (newArgs.length <= min) {
					await discordMsg.reply(oneLine`
						You need at least more than 1 option!
					`);
					return false;
				}

				// Create the description with results
				const reactionEmotes: string[] = [];
				let description = "";

				let hasCodeBlock = false;

				for (let i = 0; i < newArgs.length; i++) {
					const element = newArgs[i];
					hasCodeBlock = element.endsWith("```");
					if (element) {
						const reactionEmote = optionEmotes[i];
						description += `${reactionEmote}  ${element}`;
						// logger.warn(`${i} + 1 = ${newArgs.length}`);
						// If it's not the last element,
						// If there's more than 7 elements
						// If there isn't a codeblock to finish it off
						// Remove the extra new line
						if (
							i + 1 <
							newArgs.length //&&
							// !element.endsWith("```")
						) {
							description += "\n";
							if (
								// Is the amount of options less than 8
								newArgs.length < 8 &&
								// Is the end of this option not a codeblock
								!hasCodeBlock &&
								// Is this option not the last one
								i + 1 != newArgs.length
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
					.setTitle(unquotedContent)
					.setDescription(stripIndent`
						${description}${hasCodeBlock ? "" : "\n"}\nPoll by ${
							discordMsg.author
						}
						You can choose a maximum of x option(s).`
					);
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
			} else if (msg.args.length > 0) {
				logger.debug(`"Doing the reactions" ${msg.args}`);
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
}
