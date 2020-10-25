import Message from "../../../src/structures/Message";
import * as Discord from "discord.js";
import { Command, CommandClass } from "../../../src/structures/Command";

@Command()
class extends CommandClass {
	constructor() {
		super({
			id: "info",
			fullId: "core.bot.main.info",
			name: "Info",
			about: "Shows info about certain commands.",
		});
	}

	async run(msg: Message): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg;
			const lookUpCmd = msg.args[0];

			if (this.plugin) {
				const plugin = this.plugin;
				const command = plugin.commands.get(lookUpCmd);

				if (command) {
					discordMsg.channel.send(
						new Discord.MessageEmbed()
							.setTitle("Command Info")
							.addField(`${command.info.name}`, `${command.info.about}`)
					);
				}
				else {
					discordMsg.channel.send(`${discordMsg.author}, Couldn't find the command "${lookUpCmd}"!`);
				}
			}
			return true;
		}
	}
}
