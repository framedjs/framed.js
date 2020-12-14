import { BasePlugin } from "back-end/src/structures/BasePlugin";
import FramedMessage from "back-end/src/structures/FramedMessage";
import { BaseCommand } from "back-end/src/structures/BaseCommand";
import { logger, Utils } from "shared";
import Discord from "discord.js";
import { stripIndent } from "common-tags";

export default class DiscohookEmbed extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "embed",
			aliases: ["createembed"],
			about: "Creates an embed from Discohook JSON.",
			description: stripIndent`
			Creates an embed from Discordhook JSON.
			To get the JSON from a Discordhook link, simply click JSON Editor and Copy to Clipboard.
			`,
			usage: "[id|link|content]",
			examples: stripIndent`
			\`{{prefix}}embed\`
			\`{{prefix}}embed This test is **bold**!\`			
			`,
			permissions: {
				discord: {
					roles: ["758771336289583125", "462342299171684364"],
				},
			},
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord && msg.args && msg.prefix && msg.command) {
			if (!this.hasPermission(msg)) {
				this.sendPermissionErrorMessage(msg);
			}

			let newContents = msg.content
				.replace(msg.prefix, "")
				.replace(msg.command, "")
				.trim();

			const firstThreeCharacters = newContents.substring(0, 3);
			const lastThreeCharacters = newContents.substring(
				newContents.length - 3,
				newContents.length
			);

			if (firstThreeCharacters == "```") {
				newContents = newContents.substring(3, newContents.length);
			}

			if (lastThreeCharacters == "```") {
				newContents = newContents.substring(0, newContents.length - 3);
			}

			if (newContents) {
				try {
					const newEmbedData = JSON.parse(newContents);

					// await msg.discord.channel.send(
					// 	`${msg.discord.author}, here your new embed message!`,

					// );

					await msg.discord.channel.send(
						Utils.turnUndefinedIfNull(
							newEmbedData.content
						) as string,
						new Discord.MessageEmbed(
							Utils.turnUndefinedIfNull(
								newEmbedData.embeds[0]
							) as Discord.MessageEmbedOptions
						)
					);
					return true;
				} catch (error) {
					logger.warn(error.stack);
					await msg.discord.channel.send(
						`${msg.discord.author}, I couldn't parse that into an embed!`
					);
					return false;
				}
			}
		}
		return false;
	}
}
