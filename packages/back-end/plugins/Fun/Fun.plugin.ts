// import Command, { CommandClass } from "../../src/structures/Command";
import { BasePlugin } from "../../src/structures/BasePlugin";
import { logger } from "shared";
import path from "path";
import FramedClient from "packages/back-end/src/structures/FramedClient";

export default class extends BasePlugin {
	constructor(framedClient: FramedClient) {
		super(framedClient, {
			id: "default.bot.fun",
			name: "Fun",
			description: "Fun commands.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
		});
	}
}
