// import Command, { CommandClass } from "../../src/structures/Command";
import { Plugin, PluginClass } from "../../src/structures/Plugin";
import { logger } from "shared";
import path from "path";

@Plugin()
export default class extends PluginClass {
	constructor() {
		super({
			info: {
				id: "default.bot.fun",
				name: "Fun",
				description:
					"Fun commands.",
				version: "0.1.0",
			},
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
		});
		logger.debug("plugin class constructor was called");
	}
}
