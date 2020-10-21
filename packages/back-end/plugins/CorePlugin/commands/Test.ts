import Message from "../../../src/structures/Message";
import { Command, CommandExecutor } from "../../../src/structures/Command";

@Command({
	id: "test",
	name: "Test Command",
	about: "A test command."
})
default class implements CommandExecutor {
	async run(msg: Message): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg;
			await discordMsg.channel.send("test");
			return true;
		}
	}
}