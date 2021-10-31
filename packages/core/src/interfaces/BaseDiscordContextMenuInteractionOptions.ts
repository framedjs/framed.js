import type { BaseDiscordInteractionOptions } from "./BaseDiscordInteractionOptions";
import type { ContextMenuCommandBuilder } from "@discordjs/builders";

export interface BaseDiscordContextMenuInteractionOptions
	extends BaseDiscordInteractionOptions {
	/** Discord context menu builder */
	contextMenuBuilder: ContextMenuCommandBuilder;

	/**
	 * Should this slash command be a global command?
	 *
	 * @default true
	 */
	global?: boolean;
}
