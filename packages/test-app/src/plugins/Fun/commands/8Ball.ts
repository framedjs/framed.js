import { FramedMessage, BasePlugin, BaseCommand } from "back-end";
import { Utils } from "shared";

export default class extends BaseCommand {
	randomResponses = [
		// Positive
		"It is certain.",
		"It is decidedly so.",
		"Without a doubt.",
		"Yes – definitely.",
		"You may rely on it.",
		"As I see it, yes.",
		"Most likely.",
		"Outlook good.",
		"Yes.",
		"Signs point to yes.",

		// Neutral
		"Reply hazy, try again.",
		"Ask again later.",
		"Better not tell you now.",
		"Cannot predict now.",
		"Concentrate and ask again.",

		// Negative
		"Don’t count on it.",
		"My reply is no.",
		"My sources say no.",
		"Outlook not so good.",
		"Very doubtful.",
	];

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "8ball",
			aliases: ["8"],
			about: "Ask a question to the bot.",
			usage: "[question]",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg, this.permissions)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		const randomIndex = Utils.randomNumber(
			0,
			this.randomResponses.length - 1
		);
		const randomResponse = this.randomResponses[randomIndex];
		await msg.send(`${randomResponse}`);
		return true;
	}
}
