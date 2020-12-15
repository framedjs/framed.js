import { ClientEvents } from "discord.js";

/**
 * Used for BaseEvent.
 */
export interface BaseEventOptions {
	/**
	 * Name of the client event.
	 */
	name: keyof ClientEvents;

	/**
	 * Description of what the event is about.
	 */
	description?: string;
}
