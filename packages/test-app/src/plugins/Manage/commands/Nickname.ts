import { FramedMessage, BasePlugin, BaseCommand } from "back-end";
import { logger } from "shared";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "nickname",
			aliases: ["nick"],
			about: "Sets the nickname of the bot.",
			usage: "<nickname>",
			permissions: {
				discord: {
					permissions: ["CHANGE_NICKNAME"],
				},
			},
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg, this.permissions)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.args) {
			// Things
			const newNickname = msg.args[0];
			if (newNickname && newNickname.length <= 32) {
				if (msg.discord) {
					const selfMember = msg.discord.guild?.members.cache.find(
						a => a.id == msg.discord?.client.user?.id
					);
					if (selfMember) {
						try {
							await selfMember.setNickname(
								newNickname,
								"Done by Framed Bot"
							);
							await msg.discord.channel.send(
								`${msg.discord?.author}, I've just changed my nickname!`
							);
						} catch (error) {
							logger.error(error.stack);
							await msg.discord.channel.send(
								`${msg.discord?.author}, something went wrong! (Do I have permission to change my own nickname?)`
							);
						}
					}
					return true;
				} else {
					logger.error(
						"This command isn't supported on other platforms!"
					);
				}
			}
		}

		return false;
	}
}
