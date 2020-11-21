import { BasePlugin } from "../../src/structures/BasePlugin";
import path from "path";
import FramedClient from "packages/back-end/src/structures/FramedClient";

export default class extends BasePlugin {
	constructor(framedClient: FramedClient) {
		super(framedClient, {
			id: "default.bot.comamnds",
			name: "Commands",
			description: "Commands plugin.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
		});
	}
}
