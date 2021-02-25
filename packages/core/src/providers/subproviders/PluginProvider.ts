import { Logger } from "@framedjs/logger";
import { Settings } from "../interfaces/Settings";
import { Provider } from "./Provider";

export class PluginProvider extends Provider {
	/**
	 * Data cached in memory. Key: Plugin ID. Value: Map<key, value>
	 */
	cache = new Map<string, Settings>();

	/**
	 * Get an array of the cache. Key: Plugin ID. Value: Map<key, value>
	 */
	get array(): [string, Settings][] {
		return Array.from(this.cache);
	}

	/**
	 *
	 * @param callPluginFunctions Should this function call the plugin's functions,
	 * such as install() and postInstall()? Set to true by default.
	 */
	async init(callPluginFunctions = true): Promise<void> {
		// Fills the cache with maps for each plugin
		for await (const plugin of this.client.plugins.pluginsArray) {
			this.cache.set(plugin.id, {});
		}

		if (callPluginFunctions) {
			// Handles installs and post installs for all new plugins
			const installs: Promise<void>[] = [];
			const postInstalls: Promise<void>[] = [];

			// Handles installs
			for (const plugin of this.client.plugins.pluginsArray) {
				if (plugin.install) {
					installs.push(plugin.install());
				}
			}
			const installSettled = await Promise.allSettled(installs);
			for (const settled of installSettled) {
				if (settled.status == "rejected") {
					Logger.error(settled.reason);
				}
			}

			// Handles post installs
			for (const plugin of this.client.plugins.pluginsArray) {
				if (plugin.postInstall) {
					postInstalls.push(plugin.postInstall());
				}
			}
			const postInstallSettled = await Promise.allSettled(postInstalls);
			for (const settled of postInstallSettled) {
				if (settled.status == "rejected") {
					Logger.error(settled.reason);
				}
			}
		}
	}

	/**
	 * Gets a key's value from a plugin
	 *
	 * @param pluginId Plugin ID
	 */
	get(pluginId: string, key: string): unknown | undefined {
		const settings = this.cache.get(pluginId);
		if (settings) {
			return settings[key];
		} else {
			return undefined;
		}
	}

	/**
	 * Gets all the settings
	 *
	 * @param pluginId Plugin ID
	 */
	getAll(pluginId: string): Settings | undefined {
		return this.cache.get(pluginId);
	}

	/**
	 * Sets a key's value
	 *
	 * @param key
	 * @param value
	 */
	async set(
		pluginId: string,
		key: string,
		value: unknown
	): Promise<Map<string, Settings>> {
		// Gets existing settings and sets our value
		const settings = this.cache.get(pluginId) ?? {};
		settings[key] = value;

		return this.cache.set(pluginId, settings);
	}

	/**
	 * Deletes a plugin's keys and values. To delete a specific
	 * key-value pair,
	 *
	 * @param pluginId Plugin ID
	 */
	async delete(pluginId: string): Promise<boolean> {
		return this.cache.delete(pluginId);
	}
}
