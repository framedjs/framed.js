import { BaseCommand, BasePlugin, EmbedHelper, FramedMessage } from "back-end";
import { oneLine, stripIndent } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "about",
			about: "View info about the bot, including its creators.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		const discordUser = msg.framedClient.client.user;

		if (msg.discord && discordUser) {
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				this.framedClient.helpCommands,
				this.id
			)
				.setTitle("About the Bot")
				.setDescription(
					stripIndent`
				${oneLine`${discordUser} is a collection of custom bots for
				<:gdu:766718483983368212> **Game Dev Underground**.`}
				`
				)
				.addField(
					"Authors",
					stripIndent`
				<@200340393596944384> - General Bot Back-End, Design
				<@359521958519504926> - Dailies Bot
				<@150649616772235264> - Advising, API, RegEx
				`
				);
			// .addField(
			// 	"Special Thanks",
			// 	stripIndent`
			// <@000000000000000000> - Bot Name
			// <@000000000000000000> - Profile Picture
			// `
			// );
			await msg.discord.channel.send(embed);
		}
		return true;
	}
}
