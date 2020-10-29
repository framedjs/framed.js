import Message from "../../../src/structures/Message";
import { Command, CommandClass } from "../../../src/structures/Command";

@Command()
default class extends CommandClass {
	constructor() {
		super({
			id: "ping",
			defaultPrefix: ".",
			name: "Ping",
			about:
				"Sends a response back to the user, replying with latency info.",
		});
	}

	async run(msg: Message): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg;

			const userDateNumber =
				discordMsg.editedTimestamp == 0 ||
				discordMsg.editedTimestamp == null
					? discordMsg.createdTimestamp
					: discordMsg.editedTimestamp;

			const newDiscordMsg = await discordMsg.channel.send(
				`Pong!`
			);

			const botDateNumber =
				newDiscordMsg.editedTimestamp == 0 ||
				newDiscordMsg.editedTimestamp == null
					? newDiscordMsg.createdTimestamp
					: newDiscordMsg.editedTimestamp;

			await newDiscordMsg.edit(
				`Pong!\n` +
				`🏓 \`Message Latency\` - ${botDateNumber - userDateNumber}ms\n` + 
				`🤖 \`API Latency\` - ${Math.round(discordMsg.client.ws.ping)}ms`
			);

			return true;
		}
		return true;
	}
}
