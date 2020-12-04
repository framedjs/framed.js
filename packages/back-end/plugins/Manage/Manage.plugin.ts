import { BasePlugin } from "../../src/structures/BasePlugin";
import FramedClient from "../../src/structures/FramedClient";
import path from "path";

export default class extends BasePlugin {
	constructor(framedClient: FramedClient) {
		super(framedClient, {
			id: "default.bot.manage",
			name: "Commands",
			description: "Manages certain things, such as commands.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
			groupEmote: ":pencil2:",
			groupName: "Manage",
		});
	}
}
