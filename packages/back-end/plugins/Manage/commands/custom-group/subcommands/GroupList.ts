import FramedMessage from "../../../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../../../src/structures/BaseCommand";
import BaseSubcommand from "../../../../../src/structures/BaseSubcommand";
import { logger } from "shared";
import PluginManager from "../../../../../src/managers/PluginManager";
import { oneLine } from "common-tags";

export default class CustomGroupEdit extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "list",
			aliases: ["show"],
			about: "Lists all custom groups.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Checks for permission
		if (
			!this.baseCommand.hasPermission(msg, this.baseCommand.permissions)
		) {
			this.baseCommand.sendPermissionErrorMessage(msg);
			return false;
		}

		await msg.discord?.channel.send("Test");

		if (msg.args) {
			
			return true;
		}
		return false;
	}
}
