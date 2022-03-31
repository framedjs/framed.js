import { BaseDiscordMenuFlowStartPage } from "./BaseDiscordMenuFlowStartPage";
import { DiscordInteraction } from "./DiscordInteraction";
import { DiscordMessage } from "./DiscordMessage";

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

		const newOptions: BaseDiscordMenuFlowNumPageOptions = Object.assign(
			options,
			{ pageNumber } as BaseDiscordMenuFlowNumPageOptions
		);
		return newOptions;
	}

	abstract render(
		msg: DiscordMessage | DiscordInteraction,
		options: BaseDiscordMenuFlowNumPageOptions
	): Promise<boolean>;
}
