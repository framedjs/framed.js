import { FramedMessage, BasePlugin, BaseCommand, EmbedHelper } from "back-end";
import { commaListsAnd, oneLineCommaLists } from "common-tags";
import { logger } from "shared";
import { DateTime } from "luxon";

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

					let categoriesNumber = 0,
						textNumber = 0,
						voiceNumber = 0;

					guild.channels.cache.forEach(channel => {
						switch (channel.type) {
							case "category":
								categoriesNumber++;
								break;
							case "news":
							case "text":
								textNumber++;
								break;
							case "voice":
								voiceNumber++;
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
						.addField("Owner", owner, true)
						.addField("Members", guild.memberCount, true)
						.addField(
							"Channels",
							`${categoriesNumber} categories,\n${textNumber} text, ${voiceNumber} voice`,
							true
						)
						.addField("Region", guild.region, true)
						.addField("Role Count", guild.roles.cache.size, true)
						.addField(
							"Created",
							`${this.getTimeAgo(guild.createdAt)}`,
							true
						)
						.addField(
							"Roles",
							oneLineCommaLists`${guild.roles.cache.array()}`
						);

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

	/**
	 * Gets a time ago. An example output would be "2 months, 15 days and 8 hours ago".
	 *
	 * @param createdAt The guild's creation date
	 *
	 * @returns Time ago
	 */
	private getTimeAgo(createdAt: Date): string {
		const finalList: string[] = [];
		const list: string[] = [];

		const createdDuration = DateTime.fromJSDate(createdAt)
			.diffNow(["years", "months", "days", "hours"])
			.negate();

		const year =
			createdDuration.years == 0 ? "" : `${createdDuration.years} years`;
		const months =
			createdDuration.months == 0
				? ""
				: `${createdDuration.months} months`;
		const days =
			createdDuration.days == 0 ? "" : `${createdDuration.days} days`;
		const hours =
			createdDuration.hours == 0
				? ""
				: `${Math.round(createdDuration.hours)} hours`;
		const minutes =
			createdDuration.minutes == 0
				? ""
				: `${Math.round(createdDuration.minutes)}`;
		list.push(year, months, days, hours, minutes);

		list.forEach(arg => {
			if (arg.length != 0) {
				finalList.push(arg);
			}
		});

		return commaListsAnd`${finalList} ago`;
	}
}
