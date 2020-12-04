import { BasePlugin } from "../../src/structures/BasePlugin";
import FramedClient from "../../src/structures/FramedClient";
import path from "path";

export default class extends BasePlugin {
	constructor(framedClient: FramedClient) {
		super(framedClient, {
			id: "com.geekoverdrivestudio.dailies",
			defaultPrefix: "!",
			name: "Dailies",
			authors: [{
				discordId: "359521958519504926",
				discordTag: "Gmanicus#5137",
				twitchUsername: "gman1cus",
				twitterUsername: "Geek_Overdrive"
			}],
			description: "Challenge yourself to do something every day.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
			},
			groupEmote: "🕒",
			groupName: "Dailies",
		});
	}
}