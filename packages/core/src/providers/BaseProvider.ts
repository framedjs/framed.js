import { Client } from "../structures/Client";
import { PlaceProvider } from "./subproviders/PlaceProvider";
import { PrefixProvider } from "./subproviders/PrefixProvider";
import { SettingsProvider } from "./subproviders/SettingsProvider";

export abstract class BaseProvider {
	readonly sep = ",";

	client: Client;

	place: PlaceProvider;
	prefixes: PrefixProvider;
	settings: SettingsProvider;

	constructor(
		client: Client,
		placeProvider?: PlaceProvider,
		prefixProvider?: PrefixProvider,
		settingsProvider?: SettingsProvider,
	) {
		if (!placeProvider) {
			placeProvider = new PlaceProvider(this);
		}
		if (!prefixProvider) {
			prefixProvider = new PrefixProvider(this);
		}
		if (!settingsProvider) {
			settingsProvider = new SettingsProvider(this);
		}
		
		this.client = client;
		this.place = placeProvider;
		this.prefixes = prefixProvider;
		this.settings = settingsProvider;
	}

	abstract init(): Promise<void>;
}
