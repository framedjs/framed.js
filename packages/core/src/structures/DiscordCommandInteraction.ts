import { DiscordInteraction } from "../structures/DiscordInteraction";

import type { DiscordCommandInteractionData } from "../interfaces/DiscordCommandInteractionData";
import type { MessageOptions } from "../interfaces/MessageOptions";

export class DiscordCommandInteraction extends DiscordInteraction {
	discordInteraction!: DiscordCommandInteractionData;

	/**
	 * Create a new Framed DiscordMessage Instance.
	 *
	 * @param options Framed Message Options
	 */
	constructor(options: MessageOptions) {
		super(options);
		super.init(options);
	}
}
