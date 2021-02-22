import { TwitchMessageData } from "../interfaces/TwitchMessageData";
import { MessageOptions } from "../interfaces/MessageOptions";
import { BaseMessage } from "./BaseMessage";

export class TwitchMessage extends BaseMessage {
	twitch: TwitchMessageData;
	platform: "twitch";

	/**
	 * Create a new Framed Message Instance.
	 *
	 * @param options Framed Message Options
	 */
	constructor(options: MessageOptions) {
		super(options);

		// Forces platform to be "twitch"
		this.platform = "twitch";

		if (!super.twitch) {
			throw new ReferenceError(
				`this.twitch is undefined, you likely only gave non-Twitch data.`
			);
		} else {
			this.twitch = super.twitch;
		}
	}
}
