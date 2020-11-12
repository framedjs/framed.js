import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { emotes } from "../shared/Shared";
import { MessageReaction } from "discord.js";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import { stripIndent } from "common-tags";

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
			usage: "<question> [\"option 1\"] [\"option 2\"]"
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg;
			const regex = msg.content.match(/"/g);

			// If quotes have happened more than twice
			if ((regex || []).length >= 2) {
				// Create embed poll
				// TODO
				
			} else {
				const msgReact: Promise<MessageReaction>[] = [];
				emotes.forEach(element => {
					msgReact.push(discordMsg.react(element));
				});
	
				await Promise.all(msgReact);	
			}
		}
		return true;
	}
}
