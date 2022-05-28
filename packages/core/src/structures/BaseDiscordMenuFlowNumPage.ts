/* eslint-disable no-mixed-spaces-and-tabs */
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
		return {
			...options,
			pageNumber:
				options.pageNumber ??
				(await super.parse(msg, options))?.pageNumber ??
				1,
		};
	}

	abstract render(
		msg: DiscordMessage | DiscordInteraction,
		options: BaseDiscordMenuFlowNumPageOptions
	): Promise<boolean>;

	getPageButton(
		buttonOptions: {
			pageNumber: number;
			maxPages: number;
			nextPage: boolean;
		},
		dataOptions?: DiscordMenuFlowIdData | string,
		secondaryText?: string
	): Discord.MessageButton {
		const customId =
			typeof dataOptions == "string"
				? dataOptions
				: this.menu.getDataId(
						{
							...dataOptions,
							pageNumber: buttonOptions.pageNumber,
						},
						secondaryText
				  );
		return new Discord.MessageButton()
			.setLabel(buttonOptions.nextPage ? "Next Page" : "Previous Page")
			.setStyle("SECONDARY")
			.setCustomId(customId)
			.setDisabled(
				buttonOptions.pageNumber < 1 ||
					buttonOptions.pageNumber > buttonOptions.maxPages
			);
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
