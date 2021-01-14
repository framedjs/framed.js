import Discord from "discord.js";

export interface Permissions {
	discord?: {
		permissions?: Discord.PermissionResolvable[];
		roles?: Discord.RoleResolvable[];
	};
}