import { DiscordInteraction } from "./DiscordInteraction";

import type { DiscordChatInputInteractionData } from "../interfaces/DiscordChatInputInteractionData";
import type { MessageOptions } from "../interfaces/MessageOptions";

export class DiscordChatInputInteraction extends DiscordInteraction {
	discordInteraction!: DiscordChatInputInteractionData;

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
