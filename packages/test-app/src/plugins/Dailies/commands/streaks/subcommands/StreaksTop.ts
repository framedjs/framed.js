import { BaseCommand, BaseSubcommand, FramedMessage } from "back-end";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "top",
			about: "Show the top three people with the highest streak.",
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
