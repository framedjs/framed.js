import { DiscordMessageData } from "../interfaces/DiscordMessageData";
import { MessageOptions } from "../interfaces/MessageOptions";
import { BaseMessage } from "./BaseMessage";

export class DiscordMessage extends BaseMessage {
	discord!: DiscordMessageData;

	// Forces platform to be "discord"
	platform: "discord" = "discord";

	/**
	 * Create a new Framed Message Instance.
	 *
	 * @param options Framed Message Options
	 */
	constructor(options: MessageOptions) {
		super(options);

		// Forces this.discord to not be undefined
		if (!this.discord) {
			throw new ReferenceError(
				`this.discord is undefined, you likely only gave non-Discord data.`
			);
		}
	}
}
