import type { UserPermissions } from "./UserPermissions";

export interface UserMessageComponentPermissions extends UserPermissions {
	/** User permissions needed to run the command. */
	userPermissions?: UserPermissions & {
		// Permissions in button interactions can't be checked automatically,
		// due to how that buttons are parsed inside the button script, rather
		// than by its IDs.
		checkAutomatically: false;
	};
}
