import { Settings } from "../interfaces/Settings";
import { Provider } from "./Provider";

export class SettingsProvider extends Provider {
	/**
	 * Data cached in memory. Key: place ID. Value: object
	 */
	cache = new Map<string, Settings>();

	/**
	 * Get an array of the cache.
	 */
	get array(): [string, Settings][] {
		return Array.from(this.cache);
	}

	async init(): Promise<void> {
		return;
	}

	/**
	 * Gets the place data.
	 *
	 * @param placeId Guild or Twitch channel ID
	 */
	get(placeId: string): Settings | undefined {
		return this.cache.get(placeId);
	}

	/**
	 * Sets the guild or Twitch channel ID's place ID.
	 *
	 * @param placeId Guild or Twitch channel ID
	 * @param key
	 * @param placeId The place ID to attach that guild or twitch channel to
	 */
	async set(
		placeId: string,
		key: string,
		value: unknown
	): Promise<Map<string, Settings>> {
		let settings = this.cache.get(placeId);
		if (!settings) {
			settings = {};
		}
		settings[key] = value;
		return this.cache.set(placeId, settings);
	}

	/**
	 * Deletes the guild or Twitch channel ID's place ID
	 *
	 * @param id Guild or Twitch channel ID
	 */
	async delete(id: string): Promise<boolean> {
		return this.cache.delete(id);
	}
}
