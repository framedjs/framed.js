// import Command, { CommandClass } from "../../src/structures/Command";
import PluginClass, { Plugin, PluginConfig } from "../../src/structures/Plugin";
import path from "path";

const config: PluginConfig = {
	info: {
		id: "core.bot.main",
		name: "Framed Core",
		description: "A core plugin of Framed, which includes commands.",
		version: "0.1.0"
	},
	paths: {
		commands: path.join(__dirname, "commands")
	}
}
@Plugin(config)
export default class extends PluginClass {
	constructor() {
		super(config);
	}
}