import { BasePlugin, FramedClient } from "back-end";
import path from "path";

export default class extends BasePlugin {
	constructor(framedClient: FramedClient) {
		super(framedClient, {
			id: "default.bot.utils",
			name: "Utilities",
			description: "Utility commands.",
			version: "0.3.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				// events: path.join(__dirname, "events"),
			},
			groupEmote: ":tools:",
			groupName: "Utilities",
		});
	}
}
