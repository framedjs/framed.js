import Message from "./Message";
import { framedClient } from "../index";
import { logger } from "shared";

export function Command(info: CommandInfo) {
	return function (target: { new(): CommandExecutor }): void {
		logger.debug("Command decorator called");

		info = { ...info, id: info.id.toLocaleLowerCase() };
		const commandExecutor = new target();
		
		// It's probably best to figure out how reflect-metadata works,
		// But I'm doing this since it's all synchronous and it'll work.
		// I hope.
		framedClient.pluginManager.importingCommand = {
			info: info, 
			exec: commandExecutor 
		};
		return;
	}
}

export interface CommandInfo {
	id: string,
	fullId: string,
	name: string,
	about?: string,
	description?: string
}

export interface CommandExecutor {
	run: (msg: Message) => Promise<boolean>;
}

export interface CommandProp {
	info: CommandInfo,
	exec: CommandExecutor
}

// export default abstract class CommandClass implements CommandInfo {
// 	public id: string;
// 	public name: string; 
// 	public about?: string;
// 	public description?: string;

// 	public fullId?: string;
// 	public readonly plugin?: PluginClass;

// 	constructor(info: CommandInfo, plugin?: PluginClass) {
// 		this.id = info.id;
// 		this.name = info.name;
// 		this.about = info.about;
// 		this.description = info.description;

// 		this.plugin = plugin;
// 		if (plugin) {
// 			this.fullId = `${plugin.id}.${this.id}`;
// 		}
// 	}

// 	abstract run(msg: Message): Promise<boolean>;

// 	/**
// 	 * Run a command
// 	 * @param msg
// 	 */
// 	abstract async run(msg: Message): Promise<boolean>;
// }