import { CooldownProvider } from "../subproviders/CooldownProvider";
import { PlaceProvider } from "../subproviders/PlaceProvider";
import { PluginProvider } from "../subproviders/PluginProvider";
import { PrefixProvider } from "../subproviders/PrefixProvider";
import { SettingsProvider } from "../subproviders/SettingsProvider";

export interface Providers {
	cooldownProvider?: CooldownProvider;
	placeProvider?: PlaceProvider;
	pluginProvider?: PluginProvider;
	prefixProvider?: PrefixProvider;
	settingsProvider?: SettingsProvider;
}
