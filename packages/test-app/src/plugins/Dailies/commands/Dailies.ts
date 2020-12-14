/* eslint-disable no-irregular-whitespace */
import EmbedHelper from "back-end/src/utils/discord/EmbedHelper";
import FramedMessage from "back-end/src/structures/FramedMessage";
import { BasePlugin } from "back-end/src/structures/BasePlugin";
import { BaseCommand } from "back-end/src/structures/BaseCommand";
import { oneLine, stripIndent } from "common-tags";

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
		if (msg.args && framedUser) {
			const bulletPoint = "​ **•** ​ ";
			const min = 1;
			const max = 2;
			const pageNum = Math.min(
				Math.max(min, Number(msg.args[0] ? msg.args[0] : min)),
				max
			);

			if (msg.discord) {
				const embed = EmbedHelper.getTemplate(
					msg.discord,
					this.framedClient.helpCommands,
					this.id
				).setTitle("Daily Challenge");

				switch (pageNum) {
					case 1:
						embed
							.setDescription(
								// WARNING: this message uses zero-width spaces.
								stripIndent`
								${bulletPoint}Challenge yourself to do something every day! 
								${bulletPoint}Every day, post about what you've been working on in <#692939668160774204>.
								${bulletPoint}Talk about submissions in <#697203526530760764> with others.
								`
							)
							.addField(
								"Checking Streaks",
								// WARNING: this message uses zero-width spaces.
								stripIndent`
								${bulletPoint}Use \`!streaks\` to check your own streaks!
								${bulletPoint}If you want to check someone else's, try \`!streaks @User\`. 
								${bulletPoint}There is also a leaderboard! Try \`!streaks top\` and \`!streaks all\`.
								`
							);
						break;
					case 2:
						embed
							.addField(
								"Challenge Mode",
								// WARNING: this message uses zero-width spaces.
								stripIndent`
								${bulletPoint}By default, you're in **Challenge Mode**! 
								${bulletPoint}In this mode, post every day about what you've done.
								${bulletPoint}You will get a **Mercy Day** every three days, which will save you from losing all your streaks if you miss a day.
								`
							)
							.addField(
								"Casual Mode",
								// WARNING: this message uses zero-width spaces.
								stripIndent`
								${bulletPoint}By using the command \`!casual\`, you can be in **Casual Mode**!
								${bulletPoint}In this mode, you can post whenever, without the threat of losing your streak.
								${bulletPoint}Your streak will be based on a weekly/monthly total, resetting every month. 
								:warning: Toggling this mode will **reset your streak and mercy days to 0.**								
								`
							);
						break;

					default:
						embed.setDescription(oneLine`
						Something went wrong; the page number isn't valid!
						(it's probably because <@200340393596944384> screwed up)`);
						break;
				}

				embed.setFooter(
					`${
						embed.footer?.text ? embed.footer.text : ""
					}\n${oneLine`Page ${pageNum}/${max} - Use .dailies [page number] to access a new page.`}`,
					embed.footer?.iconURL
				);
				await msg.discord.channel.send(embed);
				return true;
			}
		}

		return false;
	}
}
