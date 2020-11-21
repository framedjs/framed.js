import { stripIndent } from "common-tags";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import FramedMessage from "packages/back-end/src/structures/FramedMessage";
import EmbedHelper from "packages/back-end/src/utils/discord/EmbedHelper";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { cmdList } from "../shared/Shared";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "usage",
			about: "Shows what the `[]` and `<>` brackets means, along other syntax.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			const embed = EmbedHelper.applyEmbedTemplate(
				{
					client: msg.discord.client,
					author: msg.discord.author,
					guild: msg.discord.guild
				},
				this.id,
				cmdList
			).addField(
				"Usage",
				stripIndent`
				\`[]\` means the field is optional.
				\`<>\` means the field is mandatory.
				\`[A | B]\` means you can choose either A or B.
			`
			)
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
