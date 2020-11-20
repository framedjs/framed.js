import FramedMessage from "./FramedMessage";
import { BasePlugin } from "./BasePlugin";
import FramedClient from "./FramedClient";
import { CommandInfo } from "../interfaces/CommandInfo";

export abstract class BaseCommand {
	readonly framedClient: FramedClient;

	/**
	 * The plugin this command is attached to.
	 */
	plugin: BasePlugin;

	/**
	 * Stores an ID for the command that should be completely unique between plugins.
	 */
	fullId: string;

	/**
	 * The ID of the command, which cannot use spaces. All plugin IDs should try to be unique,
	 * to make sure that no plugin from different developers would overlap.
	 *
	 * Commands will use the ID to be able to be triggered.
	 *
	 * For example, if the ID was "test", then one way to be able to trigger it would
	 * be !test if the default prefix was "!".
	 */
	id: string;

	/**
	 * Stores a list of command aliases possible to trigger the command.
	 */
	aliases?: string[];

	/**
	 * The default prefix of the command. This will be seen on the help embed.
	 */
	defaultPrefix: string;

	/**
	 * A list of all possible prefixes.
	 */
	prefixes: string[];

	/**
	 * The name of the command.
	 */
	name: string;

	/**
	 * A brief, one-liner about section to talk about what the command does.
	 */
	about?: string;

	/**
	 * A description of what the command does. This is encouraged to span multiple lines.
	 */
	description?: string;

	/**
	 * Info on how to use the command.
	 */
	usage?: string;

	/**
	 * Should this command hide its usage instructions on the help embed?
	 */
	hideUsageInHelp?: boolean;

	/**
	 * Examples on how to use the command.
	 */
	examples?: string;

	/**
	 * Emoji icon when shown in the help embed.
	 */
	emojiIcon?: string;

	/**
	 * The embed inline character limit, before it becomes not inline in the help embed.
	 */
	inlineCharacterLimit?: number;

	/**
	 * Create a new BaseCommand.
	 * @param plugin Plugin that this command will be attached to
	 * @param info Command information
	 */
	constructor(plugin: BasePlugin, info: CommandInfo) {
		this.framedClient = plugin.framedClient;
		this.plugin = plugin;

		this.id = info.id.toLocaleLowerCase();
		this.fullId = `${this.plugin.id}.command.${this.id}`;
		this.aliases = info.aliases;
		this.defaultPrefix =
			info.defaultPrefix != undefined
				? info.defaultPrefix
				: plugin.defaultPrefix;

		// Prefixes array logic
		if (!info.prefixes) {
			// Info.prefixes will have a value, and cannot be undefined
			info.prefixes = [];
		}
		
		this.prefixes = info.prefixes;
		
		// If this list doesn't include the default prefix, add it
		if (!this.prefixes.includes(this.defaultPrefix))
		{
			this.prefixes.push(this.defaultPrefix);
		}

		this.name = info.name;
		this.about = info.about;
		this.description = info.description;
		this.usage = info.usage;
		this.hideUsageInHelp = info.hideUsageInHelp;
		this.examples = info.examples;
		this.emojiIcon = info.emojiIcon;
		this.inlineCharacterLimit = info.inlineCharacterLimit;

		if (this.examples) {
			this.examples = this.examples?.replace(/{{prefix}}/gi, this.defaultPrefix);
		}
	}

	/**
	 * Run the command.
	 * @param msg Framed Message
	 */
	abstract async run(msg: FramedMessage): Promise<boolean>;
}
