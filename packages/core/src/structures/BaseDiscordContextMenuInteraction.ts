import { BaseDiscordInteraction } from "./BaseDiscordInteraction";
import { BasePlugin } from "./BasePlugin";
import { ContextMenuCommandBuilder } from "@discordjs/builders";
import { DiscordInteraction } from "./DiscordInteraction";

import type { BaseDiscordContextMenuInteractionOptions } from "../interfaces/BaseDiscordContextMenuInteractionOptions";
import type Discord from "discord.js";

export abstract class BaseDiscordContextMenuInteraction
	extends BaseDiscordInteraction
	implements BaseDiscordContextMenuInteractionOptions
{
	contextMenuBuilder: ContextMenuCommandBuilder;

	global: boolean;

	constructor(
		plugin: BasePlugin,
		info: BaseDiscordContextMenuInteractionOptions
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
	 *
	 * @returns true if successful
	 */
	abstract run(
		msg: DiscordInteraction,
		interaction: Discord.ContextMenuInteraction
	): Promise<boolean>;
}
