/* eslint-disable no-mixed-spaces-and-tabs */
import { Base } from "./Base";
import { BaseMessage } from "./BaseMessage";
import { BasePlugin } from "./BasePlugin";
import Discord from "discord.js";
import { DiscordMessage } from "./DiscordMessage";
import { DiscordInteraction } from "./DiscordInteraction";
import { TwitchMessage } from "./TwitchMessage";
import { EmbedHelper } from "../utils/discord/EmbedHelper";
import { Logger } from "@framedjs/logger";
import { Utils } from "@framedjs/shared";
import {
	oneLine,
	oneLineCommaListsOr,
	oneLineInlineLists,
	stripIndents,
} from "common-tags";

import type { BasePluginObjectOptions } from "../interfaces/BasePluginObjectOptions";
import type {
	UserPermissionAllowedData,
	UserPermissionDeniedData,
	UserPermissionDeniedReasons,
} from "../interfaces/UserPermissionData";
import type {
	BotPermissionAllowedData,
	BotPermissionDeniedData,
} from "../interfaces/BotPermissionData";
import type { BotPermissions } from "../interfaces/BotPermissions";
import type { UserPermissions } from "../interfaces/UserPermissions";

interface BasePluginObjectPermissionMessage {
	discord?: {
		options:
			| Discord.MessagePayload
			| Discord.MessageOptions
			| Discord.InteractionReplyOptions;
		missingPerms: Discord.PermissionString[];
		useDm: boolean;
		overrideEditReply?: boolean;
	};
	default?: {
		message: string;
	};
}

export abstract class BasePluginObject extends Base {
	id: string;

	/** Indicates what kind of plugin object this is. */
	type:
		| "command"
		| "subcommand"
		| "interaction"
		| "menuflowpage"
		| "menuflow"
		| "unknown" = "unknown";

	/** Stores an ID for the plugin object that should be completely unique between plugins. */
	fullId: string;

	/** The plugin this plugin object is attached to. */
	plugin: BasePlugin;

	/** Bot permissions needed to run the plugin object. */
	botPermissions?: BotPermissions;

	/** User permissions needed to run the plugin object. */
	userPermissions?: UserPermissions;

	/** Contains the raw info of how this plugin object was initialized. */
	rawInfo: BasePluginObjectOptions;

	constructor(plugin: BasePlugin, info: BasePluginObjectOptions) {
		super(plugin.client);

		this.plugin = plugin;
		this.rawInfo = info;

		this.id = info.id.toLocaleLowerCase();
		this.fullId = `${plugin.id}.${this.type}.${this.id}`;

		this.botPermissions = info.botPermissions;
		this.userPermissions = info.userPermissions;
	}

	/**
	 * Shows data for if a user has a permission to do something.
	 *
	 * NOTE: If userPermissions is undefined, this will return a success.
	 *
	 * @param msg
	 * @param userPermissions
	 */
	checkUserPermissions(
		msg: BaseMessage,
		userPermissions = this.userPermissions
	): UserPermissionAllowedData | UserPermissionDeniedData {
		return BasePluginObject.checkUserPermissions(msg, userPermissions);
	}

	/**
	 * Shows data for if a user has a permission to do something.
	 *
	 * NOTE: If userPermissions is undefined, this will return a success.
	 *
	 * @param msg
	 * @param userPermissions
	 */
	static checkUserPermissions(
		msg: BaseMessage,
		userPermissions?: UserPermissions
	): UserPermissionAllowedData | UserPermissionDeniedData {
		// If the command doesn't specify permissions, assume it's fine
		if (!userPermissions) {
			return { success: true };
		}

		const interaction = msg.discordInteraction?.interaction;
		const userId = msg.discord?.author.id ?? interaction?.user.id;

		if (
			userId &&
			(msg instanceof DiscordMessage || msg instanceof DiscordInteraction)
		) {
			const reasons: UserPermissionDeniedReasons[] = [];

			// Bot owners always have permission
			if (msg.client.discord.botOwners.includes(userId)) {
				return {
					success: true,
				};
			}

			// If the command can be used by bot owners only,
			// they don't get permission since the check already failed above
			if (userPermissions.botOwnersOnly) {
				return {
					success: false,
					reasons: ["botOwnersOnly"],
				};
			}

			// If there's no discord data/entry, block it for safety
			if (!userPermissions.discord) {
				return {
					success: false,
					reasons: ["discordNoData"],
				};
			}

			// If a user is in the list, let them pass
			const passedUserCheck =
				userPermissions.discord.users?.includes(userId);
			// Checks for false, not undefined
			if (passedUserCheck == false) {
				reasons.push("discordUser");
			} else if (passedUserCheck == true) {
				return { success: true };
			}

			const member = msg.discord?.member || interaction?.member;
			if (member) {
				if (!(member instanceof Discord.GuildMember)) {
					Logger.error("member was expected to be a GuildMember");
					Logger.error(Utils.util.inspect(member));
					return { success: false, reasons: ["unknown"] };
				}

				// Stores if some checks has already passed
				let hasRole = false;
				let hasPermission = false;

				const perms =
					userPermissions.discord.permissions ??
					new Discord.Permissions();

				if (msg.discord.channel instanceof Discord.GuildChannel) {
					const channel = msg.discord.channel;
					hasPermission = channel.permissionsFor(member).has(perms);
				} else {
					// Fallback, but this should never happen
					hasPermission = member.permissions.has(perms);
				}

				if (!hasPermission) {
					reasons.push("discordMissingPermissions");
				}

				// Goes through Discord roles
				if (userPermissions.discord.roles) {
					userPermissions.discord.roles.every(role => {
						let roleId = "";
						if (role instanceof Discord.Role) {
							roleId = role.id;
						} else {
							roleId = role;
						}

						hasRole = member.roles.cache.has(roleId);
						if (hasRole) {
							return;
						}
					});

					if (!hasRole) {
						reasons.push("discordMissingRole");
					}
				} else {
					// Allow it to pass, if no roles specified
					hasRole = true;
				}

				if (hasRole && hasPermission) {
					return { success: true };
				} else {
					return { success: false, reasons: reasons };
				}
			} else {
				return {
					success: false,
					reasons: ["discordMemberPermissions"],
				};
			}
		} else if (msg instanceof TwitchMessage) {
			// TODO: Twitch Message permissions
			Logger.warn("Twitch user permissions haven't been implemented");
			return { success: true };
		}

		// Return false by default, just in case
		return { success: false, reasons: ["unknown"] };
	}

	/**
	 * Checks for if a user has the permission to do something.
	 *
	 * NOTE: If userPermissions is undefined, this returns true.
	 *
	 * @param msg
	 * @param userPermissions
	 * @param checkAdmin
	 * @param checkOwner
	 */
	hasUserPermission(
		msg: BaseMessage,
		userPermissions = this.userPermissions
	): boolean {
		return this.checkUserPermissions(msg, userPermissions).success;
	}

	async checkBotPermissions(
		msg: BaseMessage,
		botPermissions = this.botPermissions
	): Promise<BotPermissionAllowedData | BotPermissionDeniedData> {
		return BasePluginObject.checkBotPermissions(msg, botPermissions);
	}

	static async checkBotPermissions(
		msg: BaseMessage,
		botPermissions?: BotPermissions
	): Promise<BotPermissionAllowedData | BotPermissionDeniedData> {
		// If the command doesn't specify permissions, assume it's fine
		if (!botPermissions) {
			return { success: true };
		}

		if (
			msg instanceof DiscordMessage ||
			msg instanceof DiscordInteraction
		) {
			// If there's no discord data/entry, block it for safety
			if (!botPermissions.discord) {
				return {
					success: false,
					reason: "discordNoData",
				};
			}

			// Finds all the missing permissions
			const missingPerms =
				await BasePluginObject.getMissingDiscordBotPermissions(
					msg,
					botPermissions.discord.permissions
				);

			if (missingPerms.length > 0) {
				return {
					success: false,
					reason: "discordMissingPermissions",
				};
			} else {
				return {
					success: true,
				};
			}
		} else if (msg instanceof TwitchMessage) {
			// TODO: Twitch Message permissions
			// Logger.warn("Twitch bot permissions haven't been implemented");
			return { success: true };
		}

		// Return true by default, to lean towards hitting API errors
		// rather than having no output whatsoever
		return { success: true };
	}

	async getMissingDiscordBotPermissions(
		msg: DiscordMessage | DiscordInteraction,
		permissions: Discord.PermissionResolvable = []
	): Promise<Discord.PermissionString[]> {
		return BasePluginObject.getMissingDiscordBotPermissions(
			msg,
			permissions
		);
	}

	static async getMissingDiscordBotPermissions(
		msg: DiscordMessage | DiscordInteraction,
		permissions: Discord.PermissionResolvable = []
	): Promise<Discord.PermissionString[]> {
		// Gets the requested permisisons and actual permissions
		return this.getMissingDiscordMemberPermissions(
			msg,
			msg.discord.guild?.me,
			permissions
		);
	}

	/**
	 * Checks for if the bot has the permission to do something.
	 *
	 * @param msg
	 * @param botPermissions
	 */
	async hasBotPermissions(
		msg: BaseMessage,
		botPermissions = this.botPermissions
	): Promise<boolean> {
		return (await this.checkBotPermissions(msg, botPermissions)).success;
	}

	static async getMissingDiscordMemberPermissions(
		msg: DiscordMessage | DiscordInteraction,
		member?: Discord.GuildMember | null,
		permissions: Discord.PermissionResolvable = []
	): Promise<Discord.PermissionString[]> {
		// Gets the requested permisisons and actual permissions
		const channel = msg.discord.channel.isThread()
			? msg.discord.channel.parent ?? msg.discord.channel
			: msg.discord.channel;
		if (channel.partial) {
			await channel.fetch();
		}
		const requestedBotPerms = new Discord.Permissions(permissions);
		const actualMemberPerms = new Discord.Permissions(
			member && channel instanceof Discord.GuildChannel
				? member.permissionsIn(channel)
				: Discord.Permissions.DEFAULT
		);

		// Returns all the missing ones
		return actualMemberPerms.missing(requestedBotPerms);
	}

	/**
	 * Sends an error message, with what permissions the user needs to work with.
	 *
	 * @param msg
	 * @param userPermissions
	 * @param deniedData
	 * @returns
	 */
	async sendUserPermissionErrorMessage(
		msg: BaseMessage,
		userPermissions = this.userPermissions,
		deniedData = this.checkUserPermissions(msg, userPermissions)
	): Promise<boolean> {
		return BasePluginObject.sendUserPermissionErrorMessage(
			msg,
			userPermissions,
			deniedData,
			this
		);
	}

	/**
	 * Sends an error message, with what permissions the user needs to work with.
	 *
	 * @param msg
	 * @param userPermissions
	 * @param deniedData
	 * @param id
	 * @returns
	 */
	static async sendUserPermissionErrorMessage(
		msg: BaseMessage,
		permissions: UserPermissions | undefined,
		deniedData = BasePluginObject.checkUserPermissions(msg, permissions),
		pluginObject?: BasePluginObject
	): Promise<boolean> {
		const permissionMessage = await this.getUserPermissionErrorMessage(
			msg,
			permissions,
			deniedData
		);
		return this.sendPermissionErrorMessage(
			msg,
			permissionMessage,
			pluginObject
		);
	}

	/**
	 * Sends an error message, with what permissions the bot needs to work with.
	 *
	 * @param msg
	 * @param botPermissions
	 * @param deniedData
	 * @returns
	 */
	async sendBotPermissionErrorMessage(
		msg: BaseMessage,
		botPermissions = this.botPermissions,
		deniedData: BotPermissionAllowedData | BotPermissionDeniedData
	): Promise<boolean> {
		return BasePluginObject.sendBotPermissionErrorMessage(
			msg,
			botPermissions,
			deniedData,
			this
		);
	}

	/**
	 * Sends an error message, with what permissions the bot needs to work with.
	 *
	 * @param msg
	 * @param botPermissions
	 * @param deniedData
	 * @returns
	 */
	static async sendBotPermissionErrorMessage(
		msg: BaseMessage,
		botPermissions: BotPermissions | undefined,
		deniedData: BotPermissionAllowedData | BotPermissionDeniedData,
		pluginObject?: BasePluginObject
	): Promise<boolean> {
		const permissionMessage = await this.getBotPermissionErrorMessage(
			msg,
			botPermissions,
			deniedData
		);
		return this.sendPermissionErrorMessage(
			msg,
			permissionMessage,
			pluginObject
		);
	}

	/**
	 * Sends an error message, with what permissions are required for something to work.
	 *
	 * @param msg
	 * @param permissions
	 * @param deniedData
	 * @param pluginObject
	 * @returns
	 */
	static async sendPermissionErrorMessage(
		msg: BaseMessage,
		permissionMessage: BasePluginObjectPermissionMessage,
		pluginObject?: BasePluginObject
	): Promise<boolean> {
		if (
			msg instanceof DiscordMessage ||
			msg instanceof DiscordInteraction
		) {
			if (!permissionMessage.discord) {
				Logger.error("No permission message data found!");
				return false;
			}

			const options = permissionMessage.discord.options;
			const editReply =
				permissionMessage.discord.overrideEditReply != undefined
					? permissionMessage.discord.overrideEditReply
					: pluginObject?.type == "menuflow" ||
					  pluginObject?.type == "menuflowpage";
			let useDm = permissionMessage.discord.useDm;
			if (!useDm) {
				try {
					await msg.send(options, {
						editReply: editReply,
					});
				} catch (error) {
					Logger.error(error);
					Logger.error(
						"Failed to send error message initially, trying again... (useDm flag was false)"
					);
					useDm = true;
				}
			}

			if (useDm) {
				try {
					await msg.discord.author.send(options);
					let newLine = "";
					if (
						"embeds" in options &&
						(!options.embeds || !options.embeds[0])
					) {
						newLine = "_ _\n";
					}
					await msg.discord.author.send(
						newLine +
							oneLine`This error message couldn't be sent in
							<#${msg.discord.channel.id}>, due to permissions.`
					);
				} catch (error) {
					Logger.error(error);
					Logger.error("Failed to DM user the error!");
					return false;
				}
			}
		} else {
			await msg.send(
				permissionMessage.default?.message ??
					"An error occured when sending a permission error message."
			);
		}

		return true;
	}

	/**
	 * Sends an error message, with what permissions the bot needs to work with.
	 *
	 * @param msg
	 * @param botPermissions
	 * @param deniedData
	 * @returns
	 */
	static async getBotPermissionErrorMessage(
		msg: BaseMessage,
		botPermissions: BotPermissions | undefined,
		deniedData: BotPermissionAllowedData | BotPermissionDeniedData
	): Promise<BasePluginObjectPermissionMessage> {
		if (deniedData.success) {
			throw new Error(
				"deniedData should have been denied; deniedData.success was true"
			);
		}

		let missingPerms: Discord.PermissionString[] = [];
		let description = "";
		let permissionString = "";

		if (
			msg instanceof DiscordMessage ||
			msg instanceof DiscordInteraction
		) {
			if (
				!botPermissions?.discord ||
				deniedData.reason.includes("discordNoData")
			) {
				description += oneLine`Bot permissions were
					specified, but there was no specific Discord
					permission data entered. By default, this will deny
					permissions to anyone but bot owners.`;
			} else {
				// Finds all the missing permissions
				missingPerms =
					await BasePluginObject.getMissingDiscordBotPermissions(
						msg,
						botPermissions.discord.permissions
					);

				// Puts all the missing permissions into a formatted string
				let missingPermsString = "";
				for (const perm of missingPerms) {
					missingPermsString += `\`${perm}\` `;
				}

				// If it's empty, show an error
				if (!missingPermsString) {
					description = oneLine`No missing
						permissions found, something went wrong!`;
				} else {
					description = `The bot is missing the following permissions:`;
					permissionString = missingPermsString;
				}
			}

			// eslint-disable-next-line no-inner-declarations
			async function createMessageOptions(
				msg: DiscordMessage | DiscordInteraction,
				dm?: boolean
			): Promise<
				| Discord.MessagePayload
				| Discord.MessageOptions
				| Discord.InteractionReplyOptions
			> {
				let hint = "";
				const embedPermsResults =
					await BasePluginObject.checkBotPermissions(msg, {
						discord: { permissions: ["EMBED_LINKS"] },
					});
				const useEmbed = embedPermsResults.success || dm;
				const quote = useEmbed ? "" : "> ";
				if (msg.discord.guild?.id) {
					try {
						const permissionMissing = missingPerms[0];
						const channel = await msg.discord.guild.channels.fetch(
							msg.discord.channel.id
						);
						if (
							channel &&
							!channel
								.permissionsFor(msg.discord.guild.id)
								?.has(permissionMissing)
						) {
							hint = stripIndents`
								${quote}@everyone in this channel doesn't have \`${permissionMissing}\` permissions.
								${quote}
								${quote}${oneLine`If you have to disable \`${permissionMissing}\` here, try adding
								${msg.discord.client.user} to the list of Roles/Members,
								and explicity giving \`${permissionMissing}\` permission there.`}`;
						}
					} catch (error) {
						Logger.error(error);
					}
				}

				const embed = EmbedHelper.getTemplate(
					msg.discord,
					await EmbedHelper.getCheckOutFooter(msg)
				)
					.setTitle(title)
					.setDescription(description);

				if (permissionString) {
					embed.addField("Discord Permissions", permissionString);
				}

				if (hint) {
					embed.addField("Hint for Server Staff", hint);
				}

				if (useEmbed) {
					return { components: [], embeds: [embed] };
				} else {
					// Paranoid replacement
					if (!dm) {
						hint = hint.replace(
							"@everyone",
							`<@&${msg.discord.guild?.id}>`
						);
					}
					hint = hint
						? `\n\n> **Hint for Server Staff**\n${hint}`
						: "";
					return {
						content: stripIndents`**${embed.title}**
						${embed.description} ${embed.fields[0].value}${hint}`,
						components: [],
						embeds: [],
						ephemeral: true,
					};
				}
			}

			const title = "Bot Permissions Error";
			const useDm =
				msg instanceof DiscordMessage &&
				missingPerms.includes("SEND_MESSAGES");
			return {
				discord: {
					options: await createMessageOptions(msg, useDm),
					missingPerms,
					useDm,
				},
			};
		}

		return {
			default: {
				message:
					"An error occured when getting the bot permission error message.",
			},
		};
	}

	/**
	 * Sends an error message, with what permissions the user needs to work with.
	 *
	 * @param msg
	 * @param userPermissions
	 * @param deniedData
	 * @returns
	 */
	static async getUserPermissionErrorMessage(
		msg: BaseMessage,
		permissions: UserPermissions | undefined,
		deniedData = BasePluginObject.checkUserPermissions(msg, permissions)
	): Promise<BasePluginObjectPermissionMessage> {
		if (deniedData.success) {
			throw new Error(
				"deniedData should have been denied; deniedData.success was true"
			);
		}

		if (
			msg instanceof DiscordMessage ||
			msg instanceof DiscordInteraction
		) {
			const discord = msg.discord;
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg)
			).setTitle("Permission Denied");

			let useEmbed = true;
			if (deniedData.reasons.includes("discordMissingPermissions")) {
				if (permissions?.discord?.permissions) {
					// Gets user's permissions and missing permissions
					const missingPerms =
						await BasePluginObject.getMissingDiscordMemberPermissions(
							msg,
							msg.discord.member,
							["EMBED_LINKS"]
						);
					useEmbed = !missingPerms.includes("EMBED_LINKS");
				}
			}

			const notAllowed = `${msg.discord.author}, you aren't allowed to do that!`;
			const missingMessage = useEmbed
				? `You are missing:`
				: `You are missing (or aren't):`;
			let addToDescription = "";
			let exitForLoop = false;
			let missingPerms: Discord.PermissionString[] = [];

			for (const reason of deniedData.reasons) {
				if (exitForLoop) break;

				switch (reason) {
					case "botOwnersOnly":
						embed.setDescription(oneLine`
						${notAllowed} Only the bot owner(s) are.`);
						exitForLoop = true;
						break;
					case "discordNoData":
						embed.setDescription(oneLine`User permissions were
						specified, but there was no specific Discord
						permission data entered. By default, this will deny
						permissions to anyone but bot owners.`);
						exitForLoop = true;
						break;
					case "discordMemberPermissions":
						embed.setDescription(oneLine`
						There are certain member permissions needed to run this.
						Try running this command again, but on a Discord server.`);
						exitForLoop = true;
						break;
					case "discordMissingPermissions":
						if (permissions?.discord?.permissions) {
							// Gets user's permissions and missing permissions
							missingPerms =
								await BasePluginObject.getMissingDiscordMemberPermissions(
									msg,
									msg.discord.member,
									permissions.discord.permissions
								);

							// Puts all the missing permissions into a formatted string
							let missingPermsString = "";
							for (const perm of missingPerms) {
								missingPermsString += `\`${perm}\` `;
							}

							// If it's empty, show an error
							if (!missingPermsString) {
								missingPermsString = oneLine`No missing
								permissions found, something went wrong!`;
							} else {
								addToDescription = missingMessage;
							}

							embed.addField(
								"Discord Permissions",
								missingPermsString
							);
						} else {
							addToDescription += oneLine`I think there are
							missing permissions, but there are no permissions
							to check with. Something went wrong!`;
						}
						break;
					case "discordMissingRole":
						// Goes through roles
						if (permissions?.discord?.roles) {
							const roles: string[] = [];
							for (const role of permissions.discord.roles) {
								// Correctly parses the resolvable
								if (typeof role == "string") {
									const newRole =
										discord.guild?.roles.cache.get(role);
									if (!newRole) {
										Logger.error(oneLine`BasePluginObject.ts:
										Couldn't find role with role ID "${role}".`);
										roles.push(`<@&${role}>`);
									} else {
										roles.push(`${newRole}`);
									}
								} else {
									roles.push(`${role}`);
								}
							}

							if (roles.length > 0) {
								addToDescription = `${notAllowed} ${missingMessage}`;
								embed.addField(
									"Discord Roles",
									oneLineInlineLists`${roles}`
								);
								break;
							}
						}

						// If the above didn't set anything, show this instead
						embed.setDescription(oneLine`I think you are missing a
						role, but there's no roles for me to check with.
						Something went wrong!`);

						break;
					case "discordUser":
						if (permissions?.discord?.users) {
							const listOfUsers: string[] = [];

							for (const user of permissions.discord.users) {
								listOfUsers.push(`<@!${user}>`);
							}

							embed
								.setDescription(missingMessage)
								.addField(
									"Users",
									oneLineCommaListsOr`${listOfUsers}`
								);
						}
						break;
					case "discordUserMenuFlow":
						embed.setDescription(oneLine`You're not allowed to interact
						with someone else's menu flow.`);
						break;
					default:
						embed.setDescription(oneLine`${notAllowed} ${missingMessage}
						The specified reason is not known. Something went wrong!`);
						exitForLoop = true;
						break;
				}
			}

			if (addToDescription) {
				embed.setDescription(oneLine`${notAllowed} ${missingMessage}`);
			}

			const overrideEditReply = deniedData.reasons.includes(
				"discordUserMenuFlow"
			)
				? false
				: undefined;
			const useDm =
				msg instanceof DiscordMessage &&
				missingPerms.includes("SEND_MESSAGES");
			if (
				msg instanceof DiscordInteraction &&
				(embed.fields.length == 0 ||
					embed.fields[0]?.name == "Discord Permissions")
			) {
				return {
					discord: {
						options: {
							components: [],
							content: `**${embed.title}**\n${embed.description}`,
							ephemeral: true,
						},
						useDm: useDm,
						missingPerms: missingPerms,
						overrideEditReply,
					},
				};
			} else if (
				msg instanceof DiscordMessage &&
				missingPerms.includes("EMBED_LINKS") &&
				!useDm
			) {
				return {
					discord: {
						options: {
							components: [],
							content: `**${
								embed.title
							}**\n${oneLine`Unfortunately, the
							\`EMBED_LINKS\` permission is disabled, so I can't send any details.`}`,
						},
						useDm: useDm,
						missingPerms: missingPerms,
						overrideEditReply,
					},
				};
			}

			return {
				discord: {
					options: {
						components: [],
						embeds: [embed],
						ephemeral: true,
					},
					useDm: useDm,
					missingPerms: missingPerms,
					overrideEditReply,
				},
			};
		}

		return {
			default: {
				message:
					"An error occured when getting the user permission error message.",
			},
		};
	}
}
