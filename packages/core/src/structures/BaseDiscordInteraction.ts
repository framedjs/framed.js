import { BaseCommand } from "./BaseCommand";
import { BasePlugin } from "./BasePlugin";
import { Client } from "./Client";
import type Discord from "discord.js";
import type { DiscordInteraction } from "./DiscordInteraction";
import type { BotPermissions } from "../interfaces/BotPermissions";
import type { UserPermissions } from "../interfaces/UserPermissions";
import type { BaseDiscordInteractionOptions } from "../interfaces/BaseDiscordInteractionOptions";

export abstract class BaseDiscordInteraction
	extends BaseCommand
	implements BaseDiscordInteractionOptions
{
	readonly client: Client;

	/** Indicates what kind of plugin object this is. */
	type: "interaction" = "interaction";

	//#region Duplication of interface

	/** The ID of the interaction, or otherwise known as "commandName". */
	id: string;

	/** Extra notes about the command, that isn't in the description. */
	notes?: string;

	/** Bot permissions needed to run the command. */
	botPermissions?: BotPermissions;

	/** User permissions needed to run the command. */
	userPermissions?: UserPermissions;

	//#endregion

	fullId: string;

	/** The plugin this command is attached to. */
	plugin: BasePlugin;

	/** Contains the raw info of how this command was initialized. */
	rawInfo: BaseDiscordInteractionOptions;

	constructor(plugin: BasePlugin, info: BaseDiscordInteractionOptions) {
		super(plugin, info);

		this.client = plugin.client;
		this.plugin = plugin;

		this.id = info.id.toLocaleLowerCase();
		this.fullId = `${this.plugin.id}.${this.type}.${this.id}`;

		this.notes = info.notes;
		this.botPermissions = info.botPermissions;
		this.userPermissions = info.userPermissions;

		this.rawInfo = info;
	}

	/**
	 * Run the command.
	 *
	 * @param msg Framed Discord interaction
	 * @param interaction Discord.Interaction
	 *
	 * @returns true if successful
	 */
	abstract run(
		msg: DiscordInteraction,
		interaction: Discord.BaseInteraction
	): Promise<boolean>;
}
