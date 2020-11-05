import FramedMessage from "./FramedMessage";
import { BasePlugin } from "./BasePlugin";
import { Argument } from "./Argument";
import FramedClient from "./FramedClient";
import { CommandInfo } from "../interfaces/CommandInfo";

export abstract class BaseCommand {
	readonly framedClient: FramedClient;
	plugin: BasePlugin;

	readonly info: CommandInfo;
	id: string;
	fullId: string;
	defaultPrefix?: string;
	name: string;
	about?: string;
	description?: string;
	usage?: string;

	constructor(plugin: BasePlugin, info: CommandInfo) {
		info = { ...info, id: info.id.toLocaleLowerCase() };
		this.info = info;
		this.framedClient = plugin.framedClient;
		this.plugin = plugin;

		this.id = info.id.toLocaleLowerCase();
		this.defaultPrefix = info.defaultPrefix;
		this.name = info.name;

		this.fullId = `${this.plugin.id}.command.${this.id}`;
	}

	abstract async run(msg: FramedMessage): Promise<boolean>;
}
