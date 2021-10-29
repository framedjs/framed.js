import { TwitchMessageData } from "../interfaces/TwitchMessageData";
import { MessageOptions } from "../interfaces/MessageOptions";
import { BaseMessage } from "./BaseMessage";

export class TwitchMessage extends BaseMessage {
	twitch!: TwitchMessageData;
	platform: "twitch" = "twitch";

	/**
	 * Create a new Framed Message Instance.
	 *
	 * @param options Framed Message Options
	 */
	constructor(options: MessageOptions) {
		super(options);

		this.init(options);

		if (!this.twitch) {
			throw new ReferenceError(
				`this.twitch is undefined, you likely only gave non-Twitch data.`
			);
		}
	}

	init(options: MessageOptions): TwitchMessageData | undefined {
		// Grabs the base of a possible message
		const base = options.base;

		// Gets the Twitch base
		const twitchBase = options.twitch
			? options.twitch
			: base?.twitch
			? base.twitch
			: options.twitch;

		if (!twitchBase) return;

		this.platform = "twitch";
		const api = this.client.twitch.api;
		const chat = twitchBase.chat;
		const channel = twitchBase.channel;
		const user = twitchBase.user;

		if (!api) {
			throw new ReferenceError(`Parameter twitch.api is undefined.`);
		}

		if (!chat) {
			throw new ReferenceError(
				`Parameter twitch.chatClient is undefined.`
			);
		}

		if (!channel) {
			throw new ReferenceError(`Parameter twitch.channel is undefined.`);
		}

		if (!user) {
			throw new ReferenceError(`Parameter twitch.user is undefined.`);
		}

		this.twitch = {
			api: api,
			chat: chat,
			channel: channel,
			user: user,
		};
	}
	/**
	 * Sends a message, regardless of platform.
	 *
	 * @param content
	 */
	async send(content: string): Promise<void> {
		this.twitch.chat.say(this.twitch.channel, content);
	}
}
