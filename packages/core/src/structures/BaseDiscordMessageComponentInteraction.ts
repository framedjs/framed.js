import { BaseDiscordInteraction } from "./BaseDiscordInteraction";
import { DiscordInteraction } from "./DiscordInteraction";
import { BasePlugin } from "./BasePlugin";

import type { BaseDiscordInteractionOptions } from "../interfaces/BaseDiscordInteractionOptions";
import type Discord from "discord.js";

/**
 * This class should not be used, unless for compatibility reasons.
 * Use {@link BaseDiscordButtonInteraction} or {@link BaseDiscordSelectMenuInteraction} instead.
 *
 * @see https://discord.com/developers/docs/interactions/message-components#what-is-a-component
 */
export abstract class BaseDiscordMessageComponentInteraction
	extends BaseDiscordInteraction
	implements BaseDiscordInteractionOptions
{
	constructor(plugin: BasePlugin, info: BaseDiscordInteractionOptions) {
		super(plugin, info);
		this.fullId = `${this.plugin.id}.${this.type}.messagecomponent.${this.id}`;
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
		interaction: Discord.MessageComponentInteraction
	): Promise<boolean>;
}
