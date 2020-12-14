import { stripIndent } from "common-tags";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import FramedMessage from "back-end/src/structures/FramedMessage";
import EmbedHelper from "back-end/src/utils/discord/EmbedHelper";
import { BaseCommand } from "back-end/src/structures/BaseCommand";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "usage",
			about:
				"Shows what the `[]` and `<>` brackets means, along other syntax.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			const bulletPoint = "​ **•** ​ ";
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				this.framedClient.helpCommands,
				this.id
			)
				.setTitle("Usage Key")
				.setDescription(
					stripIndent`
					\`[]\` - This field is optional.
					\`<>\` - This field is mandatory.
					\`A | B\` - You can choose either A or B.
					\`...A\` - Multiple parameters could be put here.
					`
				)
				.addField(
					"Notes",
					stripIndent`
					${bulletPoint}In most cases, **do not use brackets** while trying to run commands.
					${bulletPoint}If asked for, quotes are *usually* needed (ex. fields with spaces), but not always. 
					${bulletPoint}The usage statements may be inaccurate in order to simplify them.
					`
				);

			await msg.discord.channel.send(embed);
		}

		return true;
	}
}
