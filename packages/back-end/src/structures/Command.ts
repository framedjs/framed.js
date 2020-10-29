import Message from "./Message";
import { framedClient } from "../index";
import { PluginClass } from "./Plugin";
import { Argument } from "./Argument";

export function Command() {
	return function (target: { new (): CommandClass }): void {
		// logger.debug("Command decorator called");
		const command = new target();
		framedClient.pluginManager.importingCommand = command;
	};
}

export interface CommandInfo {
	id: string;
	defaultPrefix: string;
	name: string;
	about?: string;
	description?: string;
	usage?: string;
	// args?: Argument[];
}

export abstract class CommandClass {
	public readonly info: CommandInfo;
	public plugin?: PluginClass;

	constructor(info: CommandInfo) {
		info = { ...info, id: info.id.toLocaleLowerCase() };
		this.info = info;
	}

	abstract async run(msg: Message): Promise<boolean>;

	get fullId(): string {
		const id = this.plugin?.config.info.id;
		const name = this.info.id;

		if (!id && !name)
			return `${id}.command.${name}`;
		else
			return ``;
	}
}
