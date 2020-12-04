import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import { oneLine, stripIndent } from "common-tags";
import Discord from "discord.js";
import EmbedHelper from "packages/back-end/src/utils/discord/EmbedHelper";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "ping",
			about:
				"Sends a response back to the user, replying with latency info.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg
				? msg.discord.msg
				: msg.discord.id
				? msg.discord.channel.messages.cache.get(msg.discord.id)
				: undefined;

			if (!discordMsg) {
				msg.discord?.channel.send(
					oneLine`${msg.discord.author}, calling this comamnd without someone 
					sending the command is not supported!`
				);
				return false;
			}

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

			const embed = EmbedHelper.getTemplate(
				msg.discord,
				this.framedClient.helpCommands,
				this.id
			)
				.setColor(EmbedHelper.getColorWithFallback(msg.discord.guild))
				.setTitle("Latency Info").setDescription(stripIndent`
				🏓 \`Message Latency\` - ${botDateNumber - userDateNumber}ms
				🤖 \`API Latency\` - ${Math.round(discordMsg.client.ws.ping)}ms`);
			await newDiscordMsg.edit(newDiscordMsg.content, embed);

			return true;
		}
		return false;
	}
}
