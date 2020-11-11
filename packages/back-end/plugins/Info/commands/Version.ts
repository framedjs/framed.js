import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import * as DiscordUtils from "../../../src/utils/DiscordUtils";
import { cmdList } from "../shared/Shared";
import { oneLine } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "version",
			aliases: ["v"],
			name: "Version",
			about: "Get the version of the Framed instance.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			const environment = process.env.NODE_ENV ? ` ${process.env.NODE_ENV}` : "";
			const discordMsg = msg.discord.msg;
			const embed = DiscordUtils.applyEmbedTemplate(
				discordMsg,
				this.id,
				cmdList
			)
				.setDescription(oneLine`
					Bot is currently running Framed v${this.framedClient.version}${environment}.`
				)
			await discordMsg.channel.send(embed);
		}
		return true;
	}
}
