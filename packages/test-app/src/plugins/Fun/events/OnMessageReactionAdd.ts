import Discord from "discord.js";
import { logger } from "shared";
import { emotes, oneOptionMsg, optionEmotes } from "../Fun.plugin";
import { BaseEvent, BasePlugin, FramedMessage } from "back-end";
import Emoji from "node-emoji"; // Doing this only because Windows can't render emotes for some reason
import { oneLine } from "common-tags";
import Poll from "../commands/Poll";
// import util from "util";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			name: "messageReactionAdd",
		});
	}

	async run(
		reaction: Discord.MessageReaction,
		user: Discord.User | Discord.PartialUser
	): Promise<void> {
		logger.debug(`Reaction Add From: ${user.id}`);
		// logger.debug(`OnMsgRA: ${util.inspect(this)}`);

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

		const embedDescription:
			| string
			| undefined = reaction.message.embeds[0]?.description?.toLocaleLowerCase();

		const isPollEmbed: boolean | undefined = embedDescription?.includes(
			"poll by <@"
		);

		const newContent = `${reaction.message.content
			.replace("poll:", ".poll")
			.trim()}`;

		const parsedResults = await Poll.customParse(
			new FramedMessage({
				framedClient: this.framedClient,
				content: newContent,
				discord: {
					client: reaction.message.client,
					id: reaction.message.id,
					channel: reaction.message.channel,
					author: reaction.message.author,
					guild: reaction.message.guild,
				},
			}),
			true
		);

		const singleVoteOnly: boolean | undefined =
			embedDescription?.endsWith(oneOptionMsg.toLocaleLowerCase()) ||
			parsedResults?.askingForSingle;

		const isPollCommand =
			reaction.message.content.startsWith(".poll") ||
			reaction.message.content.startsWith("poll:") ||
			isPollEmbed;

		if (isPollCommand && singleVoteOnly) {
			// https://discordjs.guide/popular-topics/reactions.html#removing-reactions-by-user
			const extraUserReactions = reaction.message.reactions.cache.filter(
				extraReaction => {
					const userHasReaction = extraReaction.users.cache.has(
						user.id
					);
					const isSimplePollReaction = emotes.includes(
						extraReaction.emoji.name
					);
					const isOptionPollReaction = optionEmotes.includes(
						extraReaction.emoji.name
					);
					const extraReactionIsntJustPlaced =
						extraReaction != reaction;

					return (
						userHasReaction &&
						(isSimplePollReaction || isOptionPollReaction) &&
						extraReactionIsntJustPlaced
					);
				}
			);

			try {
				logger.debug(oneLine`
					Current reaction: ${reaction.emoji.name} 
					(${Emoji.unemojify(reaction.emoji.name)} unemojified)`);

				for await (const reaction of extraUserReactions.values()) {
					logger.debug(oneLine`
						Removing ${reaction.emoji.name} 
						(${Emoji.unemojify(reaction.emoji.name)} unemojified)`);
					await reaction.users.remove(user.id);
				}
			} catch (error) {
				if (!(reaction.message.channel instanceof Discord.DMChannel)) {
					logger.error(
						`Failed to remove reactions, where it should\n${error.stack}`
					);
				}
			}
		}
	}
}
