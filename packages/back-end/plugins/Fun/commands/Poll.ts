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
			about: "Create a poll.",
			description: stripIndent`
				Create a simple, reaction-based poll through Discord.
			`,
			usage: '<question> ["option 1"] ["option 2"]',
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
			const trimmedArgs = msg.trimmedArgs();

			// If quotes have happened more than twice,
			// Along with msg.args and trimemdArgs confirmations for TS
			if (
				(regex || []).length >= 2 &&
				msg.args &&
				trimmedArgs &&
				msg.prefix &&
				msg.command
			) {
				// If we go over the Discord reaction limit,
				// We tell the user we can't do that
				if (msg.args.length > 21) {
					discordMsg.reply(oneLine`
						Too many options! The max number of options is 20 due to Discord reactions.
					`);
					return false;
				} else {
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
					const newArgs = FramedMessage.getArgs(optionsContent);

					logger.debug(`newArgs = ${newArgs}`);

					// Create the description with results
					const reactionEmotes: string[] = [];
					let description = "";

					if (unquotedContent == "") {
						const shiftedArgs = newArgs.shift();
						if (shiftedArgs) {
							unquotedContent = shiftedArgs;
						}
					}

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
						.setDescription(
							`${description}${
								hasCodeBlock ? "" : "\n"
							}\nPoll by ${discordMsg.author}`
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
				}
			} else {
				const msgReact: Promise<Discord.MessageReaction>[] = [];
				emotes.forEach(element => {
					msgReact.push(discordMsg.react(element));
				});
				await Promise.all(msgReact);
			}
		}
		return true;
	}
}
