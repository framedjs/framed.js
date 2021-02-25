import { oneLine } from "common-tags";
import { Base } from "../structures/Base";
import { Client } from "../structures/Client";
import { Providers } from "./interfaces/Providers";
import { PlaceProvider } from "./subproviders/PlaceProvider";
import { PluginProvider } from "./subproviders/PluginProvider";
import { PrefixProvider } from "./subproviders/PrefixProvider";
import { SettingsProvider } from "./subproviders/SettingsProvider";
import { Logger } from "@framedjs/logger";

export class BaseProvider extends Base {
	places: PlaceProvider;
	plugins: PluginProvider;
	prefixes: PrefixProvider;
	settings: SettingsProvider;

	constructor(client: Client, options?: Providers) {
		super(client);

		this.places = options?.placeProvider ?? new PlaceProvider(this);
		this.plugins = options?.pluginSettings ?? new PluginProvider(this);
		this.prefixes = options?.prefixProvider ?? new PrefixProvider(this);
		this.settings = options?.settingsProvider ?? new SettingsProvider(this);
	}

	async init(specifiedProvider = false): Promise<void> {
		if (!specifiedProvider) {
			Logger.warn(oneLine`There was no specified provider,
			so all data will be lost upon a restart.`);
		}

		// Does the place initialization first
		await this.places.init();

		// Do everything else
		await Promise.all([
			this.plugins.init(),
			this.prefixes.init(),
			this.settings.init(),
		]);

		// Runs this function after we've loaded all providers
		const loadedProvidersList: Promise<void>[] = [];
		for await (const plugin of this.client.plugins.map.values()) {
			if (plugin.loadedProviders) {
				loadedProvidersList.push(plugin.loadedProviders());
			}
		}

		const settled = await Promise.allSettled(loadedProvidersList);
		for (const settle of settled) {
			if (settle.status == "rejected") {
				Logger.error(settle.status);
			}
		}

		Logger.info("Initalized provider and subproviders");
	}
}
