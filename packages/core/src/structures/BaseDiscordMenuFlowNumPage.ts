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
		const parse = await super.parse(msg, options);
		return {
			...options,
			pageNumber: options.pageNumber ?? parse?.pageNumber ?? 1,
		};
	}

	abstract render(
		msg: DiscordMessage | DiscordInteraction,
		options: BaseDiscordMenuFlowNumPageOptions
	): Promise<boolean>;

	/**
	 * Create a new Discord Message Button, used for making paginated menu flows.
	 *
	 * @param buttonOptions Button options
	 * @param dataOptions Options used for creating a proper custom ID within the function.
	 * @param optionsIdText Contains your page ID and other
	 * parameters, so the custom ID gets formed correctly.
	 * @returns Page button
	 */
	getPageButton(
		buttonOptions: {
			pageNumber: number;
			maxPages: number;
			nextPage: boolean;
		},
		dataOptions: DiscordMenuFlowIdData,
		optionsIdText: string
	): Discord.ButtonBuilder {
		const customId = this.menu.getDataId(
			{
				...dataOptions,
				pageNumber: buttonOptions.pageNumber,
			},
			optionsIdText
		);
		return new Discord.ButtonBuilder()
			.setLabel(buttonOptions.nextPage ? "Next Page" : "Previous Page")
			.setStyle(Discord.ButtonStyle.Secondary)
			.setCustomId(customId)
			.setDisabled(
				buttonOptions.pageNumber < 1 ||
					buttonOptions.pageNumber > buttonOptions.maxPages
			);
	}

	/**
	 * Sets an embed's footer to have a page display.
	 *
	 * @param embed Embed builder
	 * @param pageNumber Page number
	 * @param maxPages Max pages number
	 * @returns Embed builder that was passed in
	 */
	setPageFooter(
		embed: Discord.EmbedBuilder,
		pageNumber: number,
		maxPages: number
	): Discord.EmbedBuilder {
		return embed.setFooter({
			text: `Page ${pageNumber}/${maxPages}${
				embed.data.title ? `  •  ${embed.data.title}` : ""
			}`,
		});
	}
}
