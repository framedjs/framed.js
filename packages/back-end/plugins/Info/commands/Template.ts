import Message from "packages/back-end/src/structures/Message";
import { Command, CommandClass } from "../../../src/structures/Command";

@Command()
default class extends CommandClass {
	constructor() {
		super({
			id: "template",
			defaultPrefix: ".",
			name: "Command Template",
			about: "Not a real command.",
			usage: "Copy me!",
		});
	}
	
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async run(msg: Message): Promise<boolean> {
		return true;
	}
}