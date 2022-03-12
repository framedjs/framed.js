import type { BasePluginObjectOptions } from "./BasePluginObjectOptions";
import type Discord from "discord.js";

export interface BaseDiscordMenuFlowOptions extends BasePluginObjectOptions {
	discordInteraction: BaseDiscordMenuFlowDiscordInteractionOptions[];

	/** The menu flow tries to import scripts from paths found in this object. */
	paths: {
		pages: string;
	};
}

export interface BaseDiscordMenuFlowDiscordInteractionOptions {
	discordIdTrigger: string | string[];
	pageId: string;
	type?: Discord.MessageComponentType;
}
