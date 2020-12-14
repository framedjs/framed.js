import Discord from "discord.js";
import { BaseEvent } from "back-end/src/structures/BaseEvent";
import { BasePlugin } from "back-end/src/structures/BasePlugin";
import { logger } from "shared";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			name: "message",
		});
	}

	async run(msg: Discord.Message): Promise<void> {
		// Commented out due to opt-in role implementation means that
		// all user roles will turn dark, because they have no other colored role above it.

		// if (msg.member && msg.member.guild.available && !msg.author.bot) {
		// 	// Attempts to find the Opt-in header role, through
		// 	// ID, name or its blending color
		// 	const roles = msg.member.guild.roles;
		// 	const optInHeaderRole =
		// 		roles.cache.get("769059162167705610") ||
		// 		roles.cache.find(
		// 			role => role.name == "—　　　　Opt-In Roles　　　　—"
		// 		) ||
		// 		roles.cache.find(role => role.hexColor == "#2f3136");

		// 	const hasAnyOptInRole =
		// 		msg.member.roles.cache.find(role =>
		// 			role.name.includes("Notification")
		// 		) != undefined;

		// 	// If found, try to add it to the member
		// 	if (optInHeaderRole) {
		// 		try {
		// 			// If the member doesn't have the role, and has some opt-in role,
		// 			// give the header role to the user
		// 			if (
		// 				!msg.member.roles.cache.has(optInHeaderRole.id) &&
		// 				hasAnyOptInRole
		// 			) {
		// 				await msg.member.roles.add(optInHeaderRole);
		// 			}
		// 		} catch (error) {
		// 			logger.error(error.stack);
		// 		}
		// 	}
		// }
	}
}
