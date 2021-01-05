import { FramedMessage, BasePlugin, BaseCommand, EmbedHelper } from "back-end";
import { oneLineCommaLists } from "common-tags";
import { logger } from "shared";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "server",
			about: "View server stats.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg, this.permissions)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.args) {
			if (msg.discord) {
				if (msg.discord.guild) {
					if (!msg.discord.guild.available) {
						logger.warn(`guild not availiable`);
					}

					const guild = await msg.discord.guild.fetch();
					const iconUrl = guild.iconURL({
						dynamic: true,
					});

					let textChannelNumber = 0,
						voiceChannelNumber = 0;

					guild.channels.cache.forEach(channel => {
						switch (channel.type) {
							case "text":
							case "news":
								textChannelNumber++;
								break;
							case "voice":
								voiceChannelNumber++;
								break;
						}
					});

					let owner = "Error";
					try {
						owner = (
							await msg.discord.guild.members.fetch(guild.ownerID)
						).toString();
					} catch (error) {
						logger.error(error.stack);
					}

					// guild.setChannelPositions();
					const embed = EmbedHelper.getTemplate(
						msg.discord,
						this.framedClient.helpCommands,
						this.id
					)
						.setTitle("Server Stats")
						.addField("Members", guild.memberCount, true)
						.addField("Owner", owner, true)
						.addField(
							"Channels",
							`${textChannelNumber} text, ${voiceChannelNumber} voice`,
							true
						)
						.addField("Region", guild.region, true)
						.addField("Roles", oneLineCommaLists`${guild.roles.cache.array()}`)

					if (iconUrl) {
						embed.setThumbnail(iconUrl);
					}

					await msg.discord.channel.send(embed);

					return true;
				} else {
					logger.error("guild is null");
					return false;
				}
			}
		}

		return false;
	}
}
