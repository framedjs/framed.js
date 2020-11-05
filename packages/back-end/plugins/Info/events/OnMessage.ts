import FramedMessage from "packages/back-end/src/structures/FramedMessage"
import { Event, EventListener } from "../../../src/structures/BaseEvents"
import Discord from "discord.js";

@Event('message')
default class implements EventListener {
	listen = async (msg: Discord.Message) => {
		if (msg.content.toLocaleLowerCase().includes("tim is innocent")) {
			msg.reply("TIM IS GUILTY");
		}
	}
}