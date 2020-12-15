import { FramedMessage } from "back-end";
import { BaseCommand } from "back-end";
import { BaseSubcommand } from "back-end";

export default class CustomCommandAdd extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "add",
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
		}

		if (msg.discord) {
			// Do things!
			// await msg.discord.channel.send("test"); // Uncomment me!
			return true;
		}
		return false;
	}
}
