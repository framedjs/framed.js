import Message from "../../../src/structures/Message";
import { Command, CommandClass } from "../../../src/structures/Command";

@Command()
default class extends CommandClass {
	constructor() {
		super({
			id: "test",
			fullId: "core.bot.main.test",
			defaultPrefix: ".",
			name: "Test Command",
			about: "A test command.",
		});
	}

	async run(msg: Message): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg;
			await discordMsg.channel.send("test");
		}
		return true;
	}
}
