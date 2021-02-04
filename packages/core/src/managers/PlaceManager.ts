import { Client } from "../structures/Client";
import { Base } from "../structures/Base";
import { Place } from "../interfaces/Place";

export class PlaceManager extends Base {
	private placePrefixes = new Map<string, string>();
	readonly sep = ",";

	constructor(client: Client) {
		super(client);
	}

	/**
	 * Get an array of the private placePrefixes Map
	 */
	get placePrefixesArray(): [string, string][] {
		return Array.from(this.placePrefixes);
	}

	/**
	 * Create a key to get a value from placePrefixes.
	 * 
	 * @param id Prefix ID
	 * @param place Place data
	 */
	generatePlaceKey(id: string, place: Place): string {
		return `${id}${this.sep}${place.id}${this.sep}${place.platform}`;
	}

	/**
	 * Gets the guild or Twitch channel ID's default prefix.
	 *
	 * @param id Prefix ID
	 * @param place Place data
	 */
	getPlace(id: string, place: Place): string | undefined {
		return this.placePrefixes.get(this.generatePlaceKey(id, place));
	}

	/**
	 * Sets the guild or Twitch channel ID's default prefix.
	 *
	 * @param id Prefix ID
	 * @param place Place data
	 * @param prefix Prefix string
	 */
	async setPlace(id: string, place: Place, prefix: string): Promise<void> {
		await this.client.database.addPrefix(prefix, id, place, true);
		this.placePrefixes.set(this.generatePlaceKey(id, place), prefix);
	}

	/**
	 * Deletes the guild or Twitch channel ID's default prefix.
	 *
	 * @param id Prefix ID
	 * @param place Place data
	 */
	async deletePlace(id: string, place: Place): Promise<void> {
		if (this.placePrefixes.get(this.generatePlaceKey(id, place))) {
			await this.client.database.deletePrefix(id, place);
		}

		this.placePrefixes.delete(
			`${id}${this.sep}${place.id}${this.sep}${place.platform}`
		);
	}
}
