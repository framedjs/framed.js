import { BasePlugin } from "../../src/structures/BasePlugin";
import path from "path";
import FramedClient from "../../src/structures/FramedClient";

export default class extends BasePlugin {
	constructor(framedClient: FramedClient) {
		super(framedClient, {
			id: "default.bot.utils",
			name: "Utilities",
			description: "Utility commands.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				// events: path.join(__dirname, "events"),
			},
			categoryIcon: ":tools:",
			defaultCategory: "Utilities",
		});
	}
}
