import { stripIndent } from "common-tags";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import FramedMessage from "packages/back-end/src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import * as DiscordUtils from "../../../src/utils/DiscordUtils";
import { cmdList } from "../shared/Shared";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "usage",
			name: "Usage Cheatsheet",
			about: "Shows what the `[]` and `<>` brackets means, along other syntax.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg;
			const embed = DiscordUtils.applyEmbedTemplate(
				discordMsg,
				this.id,
				cmdList
			).addField(
				"Usage",
				stripIndent`
				\`[]\` means it is optional.
				\`<>\` means it is mandatory.
				\`[A | B]\` means you can choose either A or B.
			`
			).addField(
				"Example",
				stripIndent`
				\`.poll <question> ["option 1"] ["option 2"]\`
				
				`
			);
			await discordMsg.channel.send(embed);
		}

		return true;
	}
}
