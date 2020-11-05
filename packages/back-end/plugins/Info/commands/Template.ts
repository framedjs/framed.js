import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import FramedMessage from "packages/back-end/src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "template",
			defaultPrefix: ".",
			name: "Command Template",
			about: "Not a real command.",
			usage: "Copy me!",
		});
	}
	
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async run(msg: FramedMessage): Promise<boolean> {
		return true;
	}
}