import { BaseDiscordInteraction } from "./BaseDiscordInteraction";
import { BasePlugin } from "./BasePlugin";
import { ContextMenuCommandBuilder } from "discord.js";
import { DiscordInteraction } from "./DiscordInteraction";

import type { BaseDiscordContextMenuCommandInteractionOptions } from "../interfaces/BaseDiscordContextMenuCommandInteractionOptions";
import type Discord from "discord.js";

export abstract class BaseDiscordContextMenuCommandInteraction
	extends BaseDiscordInteraction
	implements BaseDiscordContextMenuCommandInteractionOptions
{
	contextMenuBuilder: ContextMenuCommandBuilder;

	global: boolean;

	constructor(
		plugin: BasePlugin,
		info: BaseDiscordContextMenuCommandInteractionOptions
	) {
		super(plugin, info);
		this.contextMenuBuilder = info.contextMenuBuilder;
		this.global = info.global != undefined ? info.global : true;
		this.fullId = `${this.plugin.id}.${this.type}.contextmenu.${this.id}`;
	}

	/**
	 * Run the command.
	 *
	 * @param msg Framed Discord interaction
	 * @param interaction Discord.Interaction
	 * @returns `true` if successful
	 */
	abstract run(
		msg: DiscordInteraction,
		interaction: Discord.ContextMenuCommandInteraction
	): Promise<boolean>;
}
