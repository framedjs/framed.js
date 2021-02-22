import { Logger } from "@framedjs/logger";
import { Client } from "../structures/Client";
import { BaseProvider } from "./BaseProvider";
import { PlaceProvider } from "./subproviders/PlaceProvider";
import { PrefixProvider } from "./subproviders/PrefixProvider";
import { SettingsProvider } from "./subproviders/SettingsProvider";

export class DefaultProvider extends BaseProvider {
	constructor(
		client: Client,
		placeProvider?: PlaceProvider,
		prefixProvider?: PrefixProvider,
		settingsProvider?: SettingsProvider
	) {
		super(client, placeProvider, prefixProvider, settingsProvider);
	}

	async init(): Promise<void> {
		Logger.warn(
			"There was no specified provider, so all data will be lost upon a restart."
		);
	}
}
