import { BaseDiscordInteraction } from "./BaseDiscordInteraction";
import { BasePlugin } from "./BasePlugin";
import { DiscordInteraction } from "./DiscordInteraction";

import type { BaseDiscordInteractionOptions } from "../interfaces/BaseDiscordInteractionOptions";
import type Discord from "discord.js";

export abstract class BaseDiscordSelectMenuInteraction
	extends BaseDiscordInteraction
	implements BaseDiscordInteractionOptions
{
	constructor(plugin: BasePlugin, info: BaseDiscordInteractionOptions) {
		super(plugin, info);
		this.fullId = `${this.plugin.id}.interaction.selectmenu.${this.id}`;
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
		interaction: Discord.SelectMenuInteraction
	): Promise<boolean>;
}
