import { FramedMessage, BasePlugin, BaseCommand, EmbedHelper } from "back-end";
import { logger } from "shared";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "user",
			prefixes: [plugin.defaultPrefix, "d."],
			about: "Gets the user for Discord markdown formatting.",
			usage: "<@mention|nickname|username|tag|id>",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg, this.permissions)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.args) {
			if (msg.discord) {
				const embed = EmbedHelper.getTemplate(
					msg.discord,
					this.framedClient.helpCommands,
					this.id
				);
				await msg.discord.channel.send(embed); // Uncomment me!
				return true;
			} else {
				logger.warn("unsupported");
			}
		}

		return false;
	}
}
