/**
 * To be used with BasePlugin.
 */
export interface PluginInfo {
	/**
	 * The ID of the plugin, which cannot use spaces. All plugin IDs should try to be unique, 
	 * to make sure that no plugin from different developers would overlap.
	 * 
	 * Example: com.example.mynewplugin
	 */
	id: string;

	/**
	 * Optional prefix override from the client.
	 */
	defaultPrefix?: string;

	/**
	 * The name of the plugin.
	 */
	name: string;

	/**
	 * A description of what the plugin does. This is encouraged to span multiple lines
	 */
	description: string;

	/**
	 * The version number of the plugin.
	 */
	version: string;

	/**
	 * Author data on a plugin.
	 */
	authors?: [
		{
			discordTag?: string;
			discordId?: string;

			twitchUsername?: string;
			twitchId?: string;

			githubUsername?: string;
			// githubId?: string,

			twitterUsername?: string;
			// twitterId?: string,
		}
	];

	/**
	 * A link to the GitHub repo for the plugin.
	 */
	githubRepo?: string;

	/**
	 * A link to a raw GitHub script.
	 */
	githubRaw?: string;

	/**
	 * TODO: changelog
	 */
	changelog?: [
		{
			version: string;
		}
	];

	/**
	 * Framed will try and import scripts from paths found in this object.
	 */
	paths: {
		/**
		 * Command path.
		 */
		commands?: string;

		/**
		 * Events path
		 */
		events?: string;
	};
}
