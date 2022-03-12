import type { UserPermissions } from "./UserPermissions";
import type { BotPermissions } from "./BotPermissions";

export interface BasePluginObjectOptions {
	id: string;

	/** Bot permissions needed to run the command. */
	botPermissions?: BotPermissions;

	/** User permissions needed to run the command. */
	userPermissions?: UserPermissions;
}
