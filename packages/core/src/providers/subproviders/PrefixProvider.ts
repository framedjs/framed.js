import { Provider } from "./Provider";

export class PrefixProvider extends Provider {
	/**
	 * Data cached in memory. Key: Place ID. Value: Map<prefix ID, prefix>
	 */
	protected cache = new Map<string, Map<string, string>>();

	/**
	 * Get an array of the cache. Key: Place ID. Value: Map<prefix ID, prefix>
	 */
	get array(): [string, Map<string, string>][] {
		return Array.from(this.cache);
	}

	async init(): Promise<void> {
		// Creates prefix defaults
		await Promise.all([
			this.set("default", this.client.defaultPrefix),
			this.set("discord_default", this.client.discord.defaultPrefix),
			this.set("twitch_default", this.client.twitch.defaultPrefix),
		]);
	}

	/**
	 * Gets the prefix.
	 *
	 * @param placeId Place ID
	 * @param id Prefix ID. Defaults to "default"
	 */
	get(placeId: string, id = "default"): string | undefined {
		return this.cache.get(placeId)?.get(id);
	}

	/**
	 * Sets the guild or Twitch channel ID's place ID.
	 *
	 * @param placeId Place ID
	 * @param prefixId Prefix ID. Defaults to "default"
	 * @param prefix The prefix. If set to a null or defined, this will remove that entry!
	 */
	async set(
		placeId: string,
		prefix: string | null | undefined,
		prefixId = "default"
	): Promise<Map<string, Map<string, string>>> {
		let nestedMap = this.cache.get(placeId);
		if (!nestedMap) {
			nestedMap = new Map();
		}
		if (prefix) {
			nestedMap.set(prefixId, prefix);
		} else {
			nestedMap.delete(prefixId);
		}
		return this.cache.set(placeId, nestedMap);
	}

	/**
	 * Deletes the place's prefixes
	 *
	 * @param placeId Place ID
	 */
	async delete(placeId: string): Promise<boolean> {
		return this.cache.delete(placeId);
	}
}
