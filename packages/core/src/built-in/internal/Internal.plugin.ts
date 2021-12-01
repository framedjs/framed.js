import { Client } from "../../structures/Client";
import { BasePlugin } from "../../structures/BasePlugin";
import HeapDump from "./commands/HeapDump";
import Reload from "./commands/Reload";
import { BaseCommand } from "../..";

export default class InternalPlugin extends BasePlugin {
	constructor(client: Client) {
		super(client, {
			id: "default.bot.internal",
			name: "Internal",
			description: "Info commands.",
			version: "0.1.0",
			paths: {},
		});
	}

	async setupEvents(): Promise<void> {
		const heapDump = new HeapDump(this);
		this.setupCommand(heapDump);
		const reload = new Reload(this);
		this.setupCommand(reload);
	}

	setupCommand(command: BaseCommand): void {
		if (this.commands.has(command.id)) {
			this.unloadCommand(command.id);
		}
		this.loadCommand(command);
	}
}
