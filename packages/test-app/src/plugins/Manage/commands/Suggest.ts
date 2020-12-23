import {
	FramedMessage,
	BasePlugin,
	BaseCommand,
	EmbedHelper,
	PluginManager,
} from "back-end";
import { oneLine, stripIndent, stripIndents } from "common-tags";
import { logger, Utils } from "shared";
import Discord from "discord.js";

export default class extends BaseCommand {
	suggestionChannelId = "788616167224377344";

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "suggest",
			aliases: ["suggestion"],
			about: `Suggest something, such as event ideas or features.`,
			description: oneLine`Suggest something for the server, such as event ideas or bot features.
			If you have any concerns that you'd like to be private, please DM one of the <@&462342299171684364>.`,
			usage: "<suggestion>",
			examples: oneLine`
			\`{{prefix}}{{id}} Give the
			{{prefix}}{{id}} example a better suggestion than this.\``,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg, this.permissions)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.args && msg.args.length > 0) {
			// Things
			const argsContent = msg.getArgsContent();

			if (msg.discord) {
				if (!msg.discord.guild) {
					return false;
				}

				const suggestionChannel = msg.discord.client.channels.cache.get(
					this.suggestionChannelId
				) as Discord.TextChannel;
				if (suggestionChannel) {
					const suggestionEmbed = EmbedHelper.getTemplate(
						msg.discord,
						this.framedClient.helpCommands,
						this.id
					);
					suggestionEmbed
						.setTitle("Suggestion")
						.addField(
							"Author",
							stripIndent`
						${msg.discord.author} - \`User ID: ${msg.discord.author.id}\`
						`
						)
						.setDescription(
							oneLine`Click **[here](https://discord.com/channels/${msg.discord.guild.id}/${msg.discord.channel.id}/${msg.discord.id})**
							to see the original message. There may have been some edits!`
						)
						.addField("Suggestion", argsContent)
						.setFooter(
							`Suggestion created by ${
								msg.discord.member
									? `${msg.discord.member.displayName}#${msg.discord.author.discriminator}`
									: msg.discord.author.tag
							}`,
							suggestionEmbed.footer?.iconURL
						);
					await suggestionChannel.send(suggestionEmbed);

					const thanks = stripIndents`
					${msg.discord.author}, we appreciate your suggestion.
					This will be reviewed by the <@&462342299171684364> and <@&758771336289583125> team soon!
					`;

					const thanksEmbed = EmbedHelper.getTemplate(
						msg.discord,
						this.framedClient.helpCommands,
						this.id
					)
						.setTitle("Thank You for Your Suggestion!")
						.setDescription(thanks)
						.setFooter("");

					const thankMsg = await msg.discord.channel.send(
						thanksEmbed
					);

					try {
						await msg.discord.msg?.react("👍");
					} catch (error) {
						logger.error(error);
					}

					await Utils.sleep(3000);
					try {
						await thankMsg.delete();
					} catch (error) {
						logger.error(error.stack);
					}
				} else {
					logger.error(
						`Couldn't find channel with ID "${this.suggestionChannelId}"`
					);
					return false;
				}

				return true;
			}
		}

		await PluginManager.showHelpForCommand(msg);
		return false;
	}
}
