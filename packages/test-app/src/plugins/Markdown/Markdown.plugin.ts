import { BasePlugin, FramedClient } from "back-end";
import path from "path";

export default class Manage extends BasePlugin {
	constructor(framedClient: FramedClient) {
		super(framedClient, {
			id: "default.bot.markdown",
			name: "Markdown",
			description:
				"Shows Discord markdown formatting for things like channels and users.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				// events: path.join(__dirname, "events"),
			},
			groupEmote: ":page_facing_up:",
			groupName: "Markdown",
		});
	}
}
