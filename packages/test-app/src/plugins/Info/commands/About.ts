import FramedMessage from "back-end/src/structures/FramedMessage";
import { BaseCommand } from "back-end/src/structures/BaseCommand";
import { BasePlugin } from "back-end/src/structures/BasePlugin";
import { oneLine, stripIndent } from "common-tags";
import EmbedHelper from "back-end/src/utils/discord/EmbedHelper";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "about",
			about: "Get info about the bot, including its creators.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		const framedUser = msg.framedClient.client.user;

		if (msg.discord && framedUser) {
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				this.framedClient.helpCommands,
				this.id
			)
				.setTitle("About the Bot")
				.setDescription(
					stripIndent`
				${oneLine`Pixel Pete is a collection of custom bots for
				<:gdu:766718483983368212> **Game Dev Underground**.`}
				`
				)
				.addField(
					"Authors",
					stripIndent`
				<@200340393596944384> - General Bot Back-End and Design
				<@359521958519504926> - Dailies Bot
				<@150649616772235264> - Advising and API
				`
				)
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
