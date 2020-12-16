import { FramedMessage, BasePlugin, BaseCommand } from "back-end";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "template",
			about: "Not a real command. Instead, you should copy me!",
			usage: "<required param> [optional param]",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg, this.permissions)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.args) {
			// Things

			if (msg.discord) {
				// Do things!
				// await msg.discord.channel.send("test"); // Uncomment me!
				return true;
			}
		}

		return false;
	}
}
