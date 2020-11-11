import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import { stripIndent } from "common-tags";
import { cmdList } from "../shared/Shared";
import * as DiscordUtils from "../../../src/utils/DiscordUtils"

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "ping",
			name: "Ping",
			about:
				"Sends a response back to the user, replying with latency info.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg;

			const userDateNumber =
				discordMsg.editedTimestamp == 0 ||
				discordMsg.editedTimestamp == null
					? discordMsg.createdTimestamp
					: discordMsg.editedTimestamp;

			const newDiscordMsg = await discordMsg.channel.send(`Pong!`);

			const botDateNumber =
				newDiscordMsg.editedTimestamp == 0 ||
				newDiscordMsg.editedTimestamp == null
					? newDiscordMsg.createdTimestamp
					: newDiscordMsg.editedTimestamp;

			const embed = DiscordUtils.applyEmbedTemplate(discordMsg, "ping", cmdList);
			embed.setDescription(stripIndent`
				🏓 \`Message Latency\` - ${botDateNumber - userDateNumber}ms
				🤖 \`API Latency\` - ${Math.round(discordMsg.client.ws.ping)}ms`
			)
			await newDiscordMsg.edit(newDiscordMsg.content, embed);

			return true;
		}
		return true;
	}
}
