import { BaseDiscordMenuFlowPage } from "./BaseDiscordMenuFlowPage";
import { DiscordInteraction } from "./DiscordInteraction";
import { DiscordMessage } from "./DiscordMessage";
import type { BaseDiscordMenuFlowPageRenderOptions } from "../interfaces/BaseDiscordMenuFlowPageRenderOptions";

export abstract class BaseDiscordMenuFlowStartPage extends BaseDiscordMenuFlowPage {
	abstract render(
		msg: DiscordMessage | DiscordInteraction,
		options?: BaseDiscordMenuFlowPageRenderOptions
	): Promise<boolean>;
}
