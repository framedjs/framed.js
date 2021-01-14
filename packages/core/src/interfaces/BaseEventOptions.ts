import { BaseEventDiscordOptions } from "./BaseEventDiscordOptions";

/**
 * Used for BaseEvent.
 */
export interface BaseEventOptions {
	/**
	 * Discord options
	 */
	discord?: BaseEventDiscordOptions;

	/**
	 * ID to reference this event
	 */
	id: string;

	/**
	 * Description of what the event is about.
	 */
	description?: string;
}
