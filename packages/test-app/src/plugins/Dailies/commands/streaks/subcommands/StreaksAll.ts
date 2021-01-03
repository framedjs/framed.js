import { BaseCommand, BaseSubcommand, FramedMessage } from "back-end";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "all",
			about: "Show a list of all users' streaks.",
			hideUsageInHelp: true,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			return true;
		}
		return false;
	}
}
