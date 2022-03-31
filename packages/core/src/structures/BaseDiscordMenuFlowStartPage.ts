import { BaseDiscordMenuFlowPage } from "./BaseDiscordMenuFlowPage";
import { DiscordInteraction } from "./DiscordInteraction";
import { DiscordMessage } from "./DiscordMessage";

import type { BaseDiscordMenuFlowPageRenderOptions } from "../interfaces/BaseDiscordMenuFlowPageRenderOptions";
import type { DiscordMenuFlowIdData } from "../interfaces/DiscordMenuFlowIdData";

export abstract class BaseDiscordMenuFlowStartPage extends BaseDiscordMenuFlowPage {
	async parse(
		msg: DiscordMessage | DiscordInteraction,
		options?: DiscordMenuFlowIdData
	): Promise<DiscordMenuFlowIdData | undefined> {
		if (!options && msg instanceof DiscordInteraction) {
			const interaction = msg.discordInteraction.interaction;
			if (interaction.isMessageComponent()) {
				options = this.menu.parseId(interaction.customId);
			}
		}

		return options;
	}

	abstract render(
		msg: DiscordMessage | DiscordInteraction,
		options?: BaseDiscordMenuFlowPageRenderOptions
	): Promise<boolean>;
}
