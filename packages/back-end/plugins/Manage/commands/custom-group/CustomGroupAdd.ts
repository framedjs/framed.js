import FramedMessage from "../../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../../src/structures/BaseCommand";
import BaseSubcommand from "../../../../src/structures/BaseSubcommand";

export default class CustomCategoryAdd extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "add"
		})
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			console.log(`CustomGroupAdd run() was called!`);
			this.baseCommand.id
		}
		return false;
	}
}