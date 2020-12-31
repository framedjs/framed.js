import {
	FramedMessage,
	BasePlugin,
	BaseCommand,
	EmbedHelper,
	DiscordUtils,
	NotFoundError,
	PluginManager,
} from "back-end";
import { oneLine } from "common-tags";
import { logger } from "shared";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "channel",
			about: "Gets the channel for Discord markdown formatting.",
			description: oneLine`
			Gets the channel for Discord markdown formatting.
			The channel parameter can be the #channel identifier, name, or ID.
			`,
			usage: "<channel>",
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
				if (!msg.discord.guild || msg.discord.channel.type == "dm") {
					msg.discord.channel.send(
						`${msg.discord.author}, you must be in a Discord server in order to run this command!`
					);
					return false;
				}

				const newContent = msg.getArgsContent();
				if (newContent.length == 0) {
					await PluginManager.sendHelpForCommand(msg);
					return false;
				}

				const newChannel = DiscordUtils.resolveGuildChannel(
					newContent,
					msg.discord.guild.channels
				);
				const embed = EmbedHelper.getTemplate(
					msg.discord,
					this.framedClient.helpCommands,
					this.id
				);

				if (newChannel) {
					embed
						.setTitle("Channel Formatting")
						.setDescription(`\`${newChannel}\``)
						.addField("Output", `${newChannel}`);
					await msg.discord.channel.send(embed); // Uncomment me!
					return true;
				} else {
					throw new NotFoundError({
						input: newContent,
						name: "Channel",
					});
				}
			} else {
				logger.warn("unsupported");
			}
		}

		return false;
	}
}
