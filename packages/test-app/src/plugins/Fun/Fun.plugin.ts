// import Command, { CommandClass } from "../../src/structures/Command";
import { BasePlugin, FramedClient } from "back-end";
import path from "path";

export default class extends BasePlugin {
	constructor(framedClient: FramedClient) {
		super(framedClient, {
			id: "default.bot.fun",
			name: "Fun",
			description: "Fun commands.",
			version: "0.2.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
			groupEmote: "😛",
			groupName: "Fun",
		});
	}
}

export const emotes = ["👍", "👎", "🤷"];
export const optionEmotes = [
	"🇦",
	"🇧",
	"🇨",
	"🇩",
	"🇪",
	"🇫",
	"🇬",
	"🇭",
	"🇮",
	"🇯",
	"🇰",
	"🇱",
	"🇲",
	"🇳",
	"🇴",
	"🇵",
	"🇶",
	"🇷",
	"🇸",
	"🇹",
];
export const oneOptionMsg = "You can choose only one option."