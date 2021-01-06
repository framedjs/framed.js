/* eslint-disable no-mixed-spaces-and-tabs */
import {
	FramedMessage,
	BasePlugin,
	BaseCommand,
	PluginManager,
	DiscordUtils,
} from "back-end";
import { oneLine, stripIndent } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "render",
			aliases: ["renderembed"],
			about: "Creates an embed from a Discohook URL or JSON.",
			description: stripIndent`
			Creates an embed from Discohook JSON or URL. 
			${oneLine`To get JSON from Discohook, click JSON Editor > Copy to Clipboard.
			For a URL you can use the built-in Discohook "Share Message" URL, or any other shortened URL.`}
			`,
			usage: "<json|link>",
			examples: stripIndent`
			\`{{prefix}}{{id}} { "content": "Hello!" }\`
			\`{{prefix}}{{id}} https://is.gd/ZJGQnw\`
			\`{{prefix}}{{id}} https://share.discohook.app/go/xxxxxxxx\`			
			`,
			permissions: {
				discord: {
					roles: ["758771336289583125", "462342299171684364"],
				},
			},
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (!this.hasPermission(msg)) {
			this.sendPermissionErrorMessage(msg);
		}

		if (msg.discord && msg.args && msg.prefix && msg.command) {
			let newContents = msg.getArgsContent();

			if (newContents.trim().length == 0) {
				await PluginManager.sendHelpForCommand(msg);
				return false;
			}

			// Parses the codeblock characters out if they exist
			const firstThreeCharacters = newContents.substring(0, 3);
			const lastThreeCharacters = newContents.substring(
				newContents.length - 3,
				newContents.length
			);
			if (firstThreeCharacters == "```json") {
				newContents = newContents.substring(7, newContents.length);
			} else if (firstThreeCharacters == "```") {
				newContents = newContents.substring(3, newContents.length);
			}
			if (lastThreeCharacters == "```") {
				newContents = newContents.substring(0, newContents.length - 3);
			}

			// Gets and renders the data
			const newData = await DiscordUtils.getOutputData(newContents);
			await DiscordUtils.renderOutputData(
				newData,
				msg.discord.channel,
				msg.framedClient
			);

			return true;
		}

		return false;
	}
}
