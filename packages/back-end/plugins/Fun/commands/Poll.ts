import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { emotes } from "../shared/shared";
import { MessageReaction } from "discord.js";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "poll",
			defaultPrefix: ".",
			name: "Poll",
			about: "Creates a poll.",
			usage: "<question> [\"option 1\"] [\"option 2\"]"
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
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
