import Message from "./Message";
import { framedClient } from "../index";
import { logger } from "shared";
import { PluginClass } from "./Plugin";

export function Command() {
	return function (target: { new(): CommandClass }): void {
		// logger.debug("Command decorator called");
		const command = new target();
		framedClient.pluginManager.importingCommand = command;
	}
}

export interface CommandInfo {
	id: string,
	fullId: string,
	name: string,
	about?: string,
	description?: string
}

export abstract class CommandClass {
	public readonly info: CommandInfo;
	public plugin?: PluginClass;

	constructor(info: CommandInfo) {
		info = { ...info, id: info.id.toLocaleLowerCase() };
		this.info = info;
	}

	async abstract run(msg: Message): Promise<boolean>;
}