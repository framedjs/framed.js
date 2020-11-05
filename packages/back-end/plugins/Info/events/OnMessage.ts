import { Event, EventListener } from "../../../src/structures/BaseEvent"
import Discord from "discord.js";

@Event('message')
default class implements EventListener {
	listen = async (msg: Discord.Message) => {
		if (msg.content.toLocaleLowerCase().includes("tim is innocent")) {
			msg.reply("TIM IS GUILTY");
		}
	}
}