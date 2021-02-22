import { Place } from "../../interfaces/Place";
import { Platform } from "../../types/Platform";
import { Provider } from "./Provider";
import { nanoid } from "nanoid";
import { nanoid as nanoidAsync } from "nanoid/async";

export class PlaceProvider extends Provider {
	/**
	 * Data cached in memory.
	 */
	cache = new Map<string, Place>();

	/**
	 * Get an array of the cache.
	 */
	get array(): [string, Place][] {
		return Array.from(this.cache);
	}

	async init(): Promise<void> {
		if (this.cache.size == 0) {
			await Promise.all([
				this.set("discord_default", "discord", "discord_default"),
				this.set("twitch_default", "twitch", "twitch_default"),
				this.set("default", "none", "default"),
			]);
		}
	}

	/**
	 * Generates a random ID for a place ID.
	 */
	generateId(): string {
		return nanoid();
	}

	/**
	 * Generates a random ID for a place ID, asynchronously.
	 */
	generateIdAsync(): Promise<string> {
		return nanoidAsync();
	}

	/**
	 * Gets the place data.
	 *
	 * @param platformId Guild or Twitch channel ID
	 */
	get(platformId: string): Place | undefined {
		return this.cache.get(platformId);
	}

	/**
	 * Sets the guild or Twitch channel ID's place ID.
	 *
	 * @param platformId Guild or Twitch channel ID
	 * @param platform The platform this place entry will be attached to
	 * @param placeId The place ID to attach that guild or twitch channel to
	 */
	async set(
		platformId: string,
		platform: Platform,
		placeId: string
	): Promise<Map<string, Place>> {
		return this.cache.set(platformId, { platform: platform, id: placeId });
	}

	/**
	 * Deletes the guild or Twitch channel ID's place ID
	 *
	 * @param platformId Guild or Twitch channel ID
	 */
	async delete(platformId: string): Promise<boolean> {
		return this.cache.delete(platformId);
	}
}
