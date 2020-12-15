import { BasePlugin, FramedClient } from "back-end";
import path from "path";

export default class extends BasePlugin {
	constructor(framedClient: FramedClient) {
		super(framedClient, {
			id: "default.bot.info",
			name: "Info",
			description: "Info commands.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
			groupEmote: ":information_source:",
			groupName: "Info",
		});
	}
}