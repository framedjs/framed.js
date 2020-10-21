import Message from "../../../src/structures/Message";
import { Command, CommandExecutor } from "../../../src/structures/Command";

@Command({
	id: "ping",
	name: "Ping",
	about: "Sends a response back to the user, replying with latency info.",
})
class implements CommandExecutor {
	async run(msg: Message): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg;
			await discordMsg.channel.send(
				`🏓Latency is ${
					Date.now() - discordMsg.createdTimestamp
				}ms. API Latency is ${Math.round(discordMsg.client.ws.ping)}ms`
			);
			return true;
		}
	}
}
