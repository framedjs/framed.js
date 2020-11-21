import { BasePlugin } from "../../../src/structures/BasePlugin";
import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "template",
			about: "Not a real command.",
			usage: "Instead, you should copy me!",
		});
	}
	
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async run(msg: FramedMessage): Promise<boolean> {
		return true;
	}
}