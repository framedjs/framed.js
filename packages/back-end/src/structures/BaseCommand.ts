import FramedMessage from "./FramedMessage";
import { BasePlugin } from "./BasePlugin";
import { Argument } from "./Argument";
import FramedClient from "./FramedClient";
import { CommandInfo } from "../interfaces/CommandInfo";

export abstract class BaseCommand {
	readonly framedClient: FramedClient;
	plugin: BasePlugin;

	id: string;
	fullId: string;
	aliases?: string[];
	prefix: string;
	name: string;
	about?: string;
	description?: string;
	usage?: string;
	examples?: string;
	emojiIcon?: string;

	constructor(plugin: BasePlugin, info: CommandInfo) {
		this.framedClient = plugin.framedClient;
		this.plugin = plugin;

		this.id = info.id.toLocaleLowerCase();
		this.fullId = `${this.plugin.id}.command.${this.id}`;
		this.aliases = info.aliases;
		this.prefix =
			info.defaultPrefix != undefined
				? info.defaultPrefix
				: plugin.defaultPrefix;
		this.name = info.name;
		this.about = info.about;
		this.description = info.description;
		this.usage = info.usage;
		this.examples = info.examples;
		this.emojiIcon = info.emojiIcon;

		if (this.examples) {
			this.examples = this.examples?.replace(/{{prefix}}/gi, this.prefix);
		}
	}

	abstract async run(msg: FramedMessage): Promise<boolean>;
}
