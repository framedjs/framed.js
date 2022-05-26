import { BaseDiscordMenuFlowStartPage } from "./BaseDiscordMenuFlowStartPage";
import { DiscordInteraction } from "./DiscordInteraction";
import { DiscordMessage } from "./DiscordMessage";
import Discord from "discord.js";

import type { BaseDiscordMenuFlowNumPageOptions } from "../interfaces/BaseDiscordMenuFlowNumPageOptions";
import type { DiscordMenuFlowIdData } from "../interfaces/DiscordMenuFlowIdData";

export abstract class BaseDiscordMenuFlowNumPage extends BaseDiscordMenuFlowStartPage {
	async parse(
		msg: DiscordMessage | DiscordInteraction,
		options: DiscordMenuFlowIdData
	): Promise<BaseDiscordMenuFlowNumPageOptions> {
		let pageNumber = 1;

		if (msg instanceof DiscordInteraction) {
			const interaction = msg.discordInteraction.interaction;
			if (interaction.isMessageComponent()) {
				const parsedId = this.menu.parseId(interaction.customId);
				const lastArg = parsedId.args[parsedId.args.length - 1];
				if (lastArg) {
					const args = lastArg.split(".");
					if (args[1]) {
						const newPageIndex = Number(args[1]);
						if (!Number.isNaN(newPageIndex)) {
							pageNumber = newPageIndex;
						}
					}
				}
			}
		}

		const newOptions: BaseDiscordMenuFlowNumPageOptions = {
			...options,
			pageNumber,
		};
		return newOptions;
	}

	abstract render(
		msg: DiscordMessage | DiscordInteraction,
		options: BaseDiscordMenuFlowNumPageOptions
	): Promise<boolean>;

	getPageButton(
		customId: string,
		pageNumber: number,
		maxPages: number,
		nextPage: boolean
	): Discord.MessageButton {
		return new Discord.MessageButton()
			.setLabel(nextPage ? "Next Page" : "Previous Page")
			.setStyle("SECONDARY")
			.setCustomId(`${customId}.${pageNumber}`)
			.setDisabled(pageNumber < 1 || pageNumber > maxPages);
	}

	setPageFooter(
		embed: Discord.MessageEmbed,
		pageNumber: number,
		maxPages: number
	): Discord.MessageEmbed {
		return embed.setFooter({
			text: `Page ${pageNumber}/${maxPages}  •  ${embed.title}`,
		});
	}
}
