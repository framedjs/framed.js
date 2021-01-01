import { BasePlugin, FramedClient } from "back-end";
import path from "path";

export default class Manage extends BasePlugin {
	constructor(framedClient: FramedClient) {
		super(framedClient, {
			id: "default.bot.manage",
			name: "Manage",
			description: "Manages certain things, such as commands.",
			version: "0.2.1",
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
			groupEmote: ":pencil2:",
			groupName: "Manage",
		});
	}
}
