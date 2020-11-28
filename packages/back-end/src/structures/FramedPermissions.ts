import Discord from "discord.js";

export interface FramedPermissions {
	discord?: {
		permissions?: Discord.PermissionResolvable[];
		roles?: Discord.RoleResolvable[];
	};
}