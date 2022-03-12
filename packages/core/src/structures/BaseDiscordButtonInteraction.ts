import { BaseDiscordInteraction } from "./BaseDiscordInteraction";
import { DiscordInteraction } from "./DiscordInteraction";
import { BasePlugin } from "./BasePlugin";

import type { BaseDiscordInteractionOptions } from "../interfaces/BaseDiscordInteractionOptions";
import type Discord from "discord.js";

export abstract class BaseDiscordButtonInteraction
	extends BaseDiscordInteraction
	implements BaseDiscordInteractionOptions
{
	constructor(plugin: BasePlugin, info: BaseDiscordInteractionOptions) {
		super(plugin, info);
		this.fullId = `${this.plugin.id}.${this.type}.button.${this.id}`;
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
		interaction: Discord.ButtonInteraction
	): Promise<boolean>;
}
