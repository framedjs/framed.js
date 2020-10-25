import Message from "../../../src/structures/Message";
import { Command, CommandClass } from "../../../src/structures/Command";

@Command()
class extends CommandClass {
	constructor() {
		super({
			id: "ping",
			fullId: "core.bot.main.ping",
			name: "Ping",
			about:
				"Sends a response back to the user, replying with latency info.",
		});
	}

	async run(msg: Message): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg;
			const dateNumber =
				discordMsg.editedTimestamp == 0
					? discordMsg.createdTimestamp
					: discordMsg.editedTimestamp;

			await discordMsg.channel.send(
				`🏓 Latency is ${
					Date.now() - dateNumber
				}ms. API Latency is ${Math.round(discordMsg.client.ws.ping)}ms`
			);
			return true;
		}
	}
}
