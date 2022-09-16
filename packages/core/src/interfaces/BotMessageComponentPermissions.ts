import type { BotPermissions } from "./BotPermissions";

export interface BotMessageComponentPermissions extends BotPermissions {
	/** Bot permissions needed to run the command. */
	botPermissions?: BotPermissions & {
		// Permissions in button interactions can't be checked automatically,
		// due to how that buttons are parsed inside the button script, rather
		// than by its IDs.
		checkAutomatically: false;
	};
}
