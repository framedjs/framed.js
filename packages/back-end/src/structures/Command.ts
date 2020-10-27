import Message from "./Message";
import { framedClient } from "../index";
import { PluginClass } from "./Plugin";

export function Command() {
	return function (target: { new (): CommandClass }): void {
		// logger.debug("Command decorator called");
		const command = new target();
		framedClient.pluginManager.importingCommand = command;
	};
}

export interface CommandInfo {
	id: string;
	fullId: string;
	defaultPrefix: string;
	name: string;
	about?: string;
	description?: string;
	usage?: string;
}

export abstract class CommandClass {
	public readonly info: CommandInfo;
	public plugin?: PluginClass;

	constructor(info: CommandInfo) {
		info = { ...info, id: info.id.toLocaleLowerCase() };
		this.info = info;
	}

	abstract async run(msg: Message): Promise<boolean>;
}
