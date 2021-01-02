import { BasePlugin, FramedClient } from "back-end";
import path from "path";

export default class extends BasePlugin {
	constructor(framedClient: FramedClient) {
		super(framedClient, {
			id: "default.bot.info",
			name: "Info",
			description: "Info commands.",
<<<<<<< Updated upstream
			version: "0.2.0",
=======
			version: "0.4.0",
>>>>>>> Stashed changes
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
			groupEmote: ":information_source:",
			groupName: "Info",
		});
	}
}