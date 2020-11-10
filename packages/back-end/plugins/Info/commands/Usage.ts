import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import FramedMessage from "packages/back-end/src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import * as DiscordUtils from "../../../src/utils/DiscordUtils";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "usage",
			defaultPrefix: ".",
			name: "Usage Cheatsheet",
			about: "Shows a cheatsheet of what the `[]` and `<>` means.",
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg;
			const embed = DiscordUtils.applyEmbedTemplate(
				discordMsg,
				this.id,
				cmdList
			);
		}

		return true;
	}
}
