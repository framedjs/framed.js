import { stripIndent } from "common-tags";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import FramedMessage from "../../../src/structures/FramedMessage";
import EmbedHelper from "../../../src/utils/discord/EmbedHelper";
import { BaseCommand } from "../../../src/structures/BaseCommand";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "usage",
			about:
				"Shows what the `[]` and `<>` brackets means, along other syntax.",
			emojiIcon: "🔍",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			const embed = EmbedHelper.getEmbedTemplate(
				msg.discord,
				this.framedClient,
				this.id
			)
				.setTitle("Usage")
				.setDescription(
					stripIndent`
					\`[]\` means the field is optional.
					\`<>\` means the field is mandatory.
					\`[A | B]\` means you can choose either A or B.`
				)
				// .addField(
				// 	"Usage",
				// 	stripIndent`
				// 	\`[]\` means the field is optional.
				// 	\`<>\` means the field is mandatory.
				// 	\`[A | B]\` means you can choose either A or B.`
				// )
				.addField(
					"Note",
					stripIndent`
					In most cases, **${"DO NOT USE BRACKETS".toLocaleLowerCase()}** while trying to run commands.
					If there are quotes however, it is usually a requirement.
					The usage statements might be inaccurate in order to simplify them, too.
					`
				);
			// ).addField(
			// 	"Example",
			// 	stripIndent`
			// 	Take the sample usage text for \`.poll\`: \`.poll <question> ["option 1"] ["option 2"]\`

			// 	\`<question>\` means that you have to type your question in here.
			// 	\`.poll Should Bim be Server Owner?\`, with "Should Bim be Server Owner?" would be valid.

			// 	\`["option 1"]\` means we could decide not to put something in here.

			// 	`
			// );
			await msg.discord.channel.send(embed);
		}

		return true;
	}
}
