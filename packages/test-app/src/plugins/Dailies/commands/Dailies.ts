import EmbedHelper from "back-end/src/utils/discord/EmbedHelper";
import FramedMessage from "back-end/src/structures/FramedMessage";
import { BasePlugin } from "back-end/src/structures/BasePlugin";
import { BaseCommand } from "back-end/src/structures/BaseCommand";
import { stripIndent } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "dailies",
			prefixes: ["!", "."],
			aliases: ["daily", "dailychallenge", "dc"],
			about: "View what is the daily challenge, and how to use it.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		const framedUser = this.framedClient.client.user;
		if (msg.discord && framedUser) {
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				this.framedClient.helpCommands,
				this.id
			)
				.setTitle("Daily Challenge")
				.setDescription(
					stripIndent`
					🔸 Challenge yourself to do something every day! 
					🔸 Post about what you've been working on in <#692939668160774204>.
					🔸 Talk about submissions in <#697203526530760764> with others.`
				)
				.addField(
					"Checking Streaks",
					stripIndent`
					🔸 Use \`!streaks\` to check your own streaks!
					🔸 If you want to check someone else's, try \`!streaks @User\`. 
					🔸 There is also a leaderboard; try \`!streaks top\` and \`!streaks all\`.`
				);
			await msg.discord.channel.send(embed);
			return true;
		}

		return false;
	}
}
