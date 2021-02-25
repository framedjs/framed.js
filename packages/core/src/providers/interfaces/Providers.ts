import { PlaceProvider } from "../subproviders/PlaceProvider";
import { PluginProvider } from "../subproviders/PluginProvider";
import { PrefixProvider } from "../subproviders/PrefixProvider";
import { SettingsProvider } from "../subproviders/SettingsProvider";

export interface Providers {
	placeProvider?: PlaceProvider;
	pluginSettings?: PluginProvider;
	prefixProvider?: PrefixProvider;
	settingsProvider?: SettingsProvider;
}
