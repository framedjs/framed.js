import Message from "../../../src/structures/Message";
import { Command, CommandClass } from "../../../src/structures/Command";
import { emotes } from "../shared";
import { MessageReaction } from "discord.js";

@Command()
default class extends CommandClass {
	constructor() {
		super({
			id: "poll",
			defaultPrefix: ".",
			name: "Poll",
			about: "Creates a poll.",
			usage: "<question> [\"option 1\"] [\"option 2\"]"
		});
	}

	async run(msg: Message): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg;

			msg.parseQuotesInArgs(msg.args);

			const msgReact: Promise<MessageReaction>[] = [];
			emotes.forEach(element => {
				msgReact.push(discordMsg.react(element));
			});

			await Promise.all(msgReact);
		}
		return true;
	}
}
