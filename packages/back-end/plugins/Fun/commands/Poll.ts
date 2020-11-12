import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { emotes, optionEmotes } from "../shared/Shared";
import Discord from "discord.js";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import { oneLine, stripIndent } from "common-tags";
import * as DiscordUtils from "../../../src/utils/DiscordUtils";
import { logger } from "shared";
import Fun from "../Fun.plugin";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "poll",
			defaultPrefix: ".",
			name: "Poll",
			about: "Creates a poll.",
			description: stripIndent`
				Creates a poll!
				Examples:
				\`.poll Is Tim a murderer?\` Vote with 👍 👎 or 🤷‍♀️
				\`.poll Is Tim a murderer? "Yes" "Absolutely" "Definitely"\` Custom text options to vote for.
			`,
			usage: '<question> ["option 1"] ["option 2"]',
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
					const unquotedContent = msg.content
						.replace(msg.prefix, "")
						.replace(msg.command, "")
						.trim()
						.split(`"`)[0];
					const optionsContent = msg.content
						.replace(msg.prefix, "")
						.replace(msg.command, "")
						.replace(unquotedContent, "")
						.trim();
					logger.debug(
						`getArgs = ${FramedMessage.getArgs(optionsContent)}`
					);

					const newArgs = FramedMessage.getArgs(optionsContent);
					
					// Create the description with results
					const reactionEmotes: string[] = [];
					let description = "";
					let extraNewLine = "\n";

					// If there's more than 7 elements
					// then make sure there is no new line for each element.
					if (newArgs.length > 7) {
						extraNewLine = "";
					}

					for (let i = 0; i < newArgs.length; i++) {
						const element = newArgs[i];
						if (element) {
							// If it's the last element, remove the extra new line
							if (i + 1 == newArgs.length) {
								extraNewLine = "";
							}

							const reactionEmote = optionEmotes[i];
							description += `${reactionEmote} ${element}\n${extraNewLine}`;
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
							`${description}\nPoll by ${discordMsg.author}`
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
