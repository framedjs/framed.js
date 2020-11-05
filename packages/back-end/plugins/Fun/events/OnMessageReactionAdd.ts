import { Event, EventListener } from "../../../src/structures/BaseEvents";
import Discord from "discord.js";
import { logger } from "shared";
import { emotes } from "../shared/shared";
import Emoji from "node-emoji"; // Doing this only because Windows can't render emotes for some reason

@Event("messageReactionAdd")
default class implements EventListener {
	listen = async (
		reaction: Discord.MessageReaction,
		user: Discord.User | Discord.PartialUser
	) => {
		logger.debug(`Reaction Add From: ${user.id}`);
		if (user.bot) return;

		// https://discordjs.guide/popular-topics/reactions.html#listening-for-reactions-on-old-messages
		// When we receive a reaction we check if the reaction is partial or not
		if (reaction.partial) {
			// If the message this reaction belongs to was removed the fetching 
			// might result in an API error, which we need to handle
			try {
				await reaction.fetch();
			} catch (error) {
				logger.error(
					"Something went wrong when fetching the message: ",
					error.stack
				);
				// Return as `reaction.message.author` may be undefined/null
				return;
			}
		}

		const isPollCommand = reaction.message.content.startsWith(".poll"); // ||
		// reaction.message.content.startsWith("+poll") ||
		// reaction.message.content.startsWith("poll:") ||
		// reaction.message.author.id == "298673420181438465"; // This last one is for Poll Bot#0082
	
		if (isPollCommand) {
			// https://discordjs.guide/popular-topics/reactions.html#removing-reactions-by-user
			const extraUserReactions = reaction.message.reactions.cache.filter(
				reactionElement =>
					reactionElement.users.cache.has(user.id) &&
					emotes.includes(reactionElement.emoji.name) &&
					reactionElement != reaction
			);
	
			try {
				logger.debug(
					`Current reaction: ${Emoji.unemojify(reaction.emoji.name)}`
				);
	
				for await (const reaction of extraUserReactions.values()) {
					logger.debug(
						`Removing ${Emoji.unemojify(
							reaction.emoji.name
						)}`
					);
					await reaction.users.remove(user.id);
				}
	
			} catch (error) {
				logger.error("Failed to remove reactions.");
			}
		}
	};
}
