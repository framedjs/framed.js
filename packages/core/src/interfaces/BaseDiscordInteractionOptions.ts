import type { BotPermissions } from "./BotPermissions";
import type { CooldownOptions } from "./CooldownOptions";
import type { UserPermissions } from "./UserPermissions";

export interface BaseDiscordInteractionOptions {
	/** The ID of the interaction, or otherwise known as "commandName". */
	id: string;

	/** The command tries to import scripts from paths found in this object. */
	paths?: {
		subcommands?: string;
	};

	/** Extra notes about the command, that isn't in the description. */
	notes?: string;

	/** Bot permissions needed to run the command. */
	botPermissions?: BotPermissions;

	/** User permissions needed to run the command. */
	userPermissions?: UserPermissions;

	/** Cooldown options. */
	cooldown?: CooldownOptions;
}
