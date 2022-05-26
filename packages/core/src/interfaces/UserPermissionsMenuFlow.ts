import type { UserPermissions } from "./UserPermissions";

export interface UserPermissionsMenuFlow extends UserPermissions {
	discord?: UserPermissions["discord"] & {
		/**
		 * If an interaction is triggered by someone other than
		 * the user who triggered the interaction, tell the user
		 * they're not allowed to do that.
		 * @default true
		 */
		checkOriginalUser?: boolean;
	};
}
