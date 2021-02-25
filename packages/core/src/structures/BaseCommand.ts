import { BaseMessage } from "./BaseMessage";
import { BasePlugin } from "./BasePlugin";
import { Client } from "./Client";
import { BaseCommandOptions } from "../interfaces/BaseCommandOptions";
import Discord from "discord.js";
import { EmbedHelper } from "../utils/discord/EmbedHelper";
import { Logger } from "@framedjs/logger";
import Options from "../interfaces/other/RequireAllOptions";
import { DiscordUtils } from "../utils/discord/DiscordUtils";
import { BaseSubcommand } from "./BaseSubcommand";
import { oneLine, oneLineCommaListsOr, oneLineInlineLists } from "common-tags";
import { Prefixes } from "../interfaces/Prefixes";
import { InlineOptions } from "../interfaces/InlineOptions";
import { Place } from "../interfaces/Place";
import { UserPermissions } from "../interfaces/UserPermissions";
import { DiscordMessage } from "./DiscordMessage";
import { TwitchMessage } from "./TwitchMessage";
import {
	UserPermissionAllowedData,
	UserPermissionDeniedData,
	UserPermissionDeniedReasons,
} from "../interfaces/UserPermissionData";

export abstract class BaseCommand {
	// static readonly type: string = "BaseCommand";

	readonly client: Client;

	/** The plugin this command is attached to. */
	plugin: BasePlugin;

	/** * Stores an ID for the command that should be completely unique between plugins. */
	fullId: string;

	/**
	 * The ID of the command, which cannot use spaces. All plugin IDs should try to be unique,
	 * to make sure that no plugin from different developers would overlap.
	 *
	 * Commands will use the ID to be able to be triggered.
	 *
	 * For example, if the ID was "test", then one way to be able to trigger it would
	 * be !test if the default prefix was "!".
	 */
	id: string;

	/** The command tries to import scripts from paths found in this object. */
	paths?: {
		subcommands?: string;
	};

	/** Subcommands; key is a subcommand ID */
	subcommands: Map<string, BaseSubcommand>;

	/**  Subcommands aliases; key is a subcommand alias string */
	subcommandAliases: Map<string, BaseSubcommand>;

	/** Stores a list of command aliases possible to trigger the command. */
	aliases?: string[];

	/** The default prefix of the command.*/
	defaultPrefix: Prefixes;

	/** Has defaultPrefix been explicitly set by the script, or were the values gained implicitly? */
	private defaultPrefixExplicitlySet = false;

	/** The group name this command is in. */
	group: string;

	/** Group emote. */
	groupEmote?: string;

	/** A brief, one-liner about section to talk about what the command does. */
	about?: string;

	/** A  description of what the command does. This is encouraged to span multiple sentences. */
	description?: string;

	/**
	 * The usage key on how to use the command.
	 * Barely anyone reads these for longer commands,
	 * so make sure you have examples.
	 */
	usage?: string;

	/** Should this command hide its usage instructions on the help embed? */
	hideUsageInHelp?: boolean;

	/** Examples on how to use the command. */
	examples?: string;

	/** Extra notes about the command, that isn't in the description. */
	notes?: string;

	/** User permissions to compare to. */
	userPermissions?: UserPermissions;

	/**
	 * Inline options for help embeds. There are individual settings for each element (ex. examples, usage).
	 * However, you can set this as a boolean to make all fields be either inline or not.
	 */
	inline?: boolean | InlineOptions;

	/** Contains the raw info of how this command was initialized. */
	rawInfo: BaseCommandOptions;

	/**
	 * Create a new BaseCommand.
	 *
	 * @param plugin Plugin that this command will be attached to
	 * @param info Command information
	 */
	constructor(plugin: BasePlugin, info: BaseCommandOptions) {
		this.client = plugin.client;
		this.plugin = plugin;

		this.id = info.id.toLocaleLowerCase();
		this.paths = info.paths;
		this.fullId = `${this.plugin.id}.command.${this.id}`;
		this.group = info.group
			? info.group
			: plugin.group
			? plugin.group
			: "Other";
		this.groupEmote = plugin.groupEmote;
		this.aliases = info.aliases;

		if (typeof info.defaultPrefix == "string") {
			this.defaultPrefix = {
				discord: info.defaultPrefix,
				twitch: info.defaultPrefix,
				default: info.defaultPrefix,
			};
			this.defaultPrefixExplicitlySet = true;
		} else if (info.defaultPrefix != undefined) {
			this.defaultPrefix = info.defaultPrefix;
			this.defaultPrefixExplicitlySet = true;
		} else {
			this.defaultPrefix = {
				discord: this.client.discord.defaultPrefix,
				twitch: this.client.twitch.defaultPrefix,
				default: this.client.defaultPrefix,
			};
		}

		this.about = info.about;
		this.description = info.description;
		this.usage = info.usage;
		this.examples = info.examples;
		this.notes = info.notes;
		this.userPermissions = info.userPermissions;
		this.hideUsageInHelp = info.hideUsageInHelp;

		this.inline = info.inline ?? false;

		this.rawInfo = info;
		this.subcommands = new Map();
		this.subcommandAliases = new Map();
	}

	/**
	 * Gets the default prefix for the command.
	 *
	 * @param place Place data
	 */
	getDefaultPrefix(place: Place): string {
		// If the prefix is set explicitly in the script, use that instead
		if (this.defaultPrefixExplicitlySet) {
			switch (place.platform) {
				case "discord":
					return this.defaultPrefix.discord;
				case "twitch":
					return this.defaultPrefix.twitch;
				case "none":
					Logger.warn(
						oneLine`defaultPrefixExplicitSet:
						Couldn't find default prefix from client;
						falling back to defaultPrefix.default`
					);
					return this.defaultPrefix.default;
			}
		}

		const prefix = this.client.provider.prefixes.get(place.id);
		if (!prefix) {
			Logger.warn(
				oneLine`Couldn't find default prefix from
				place ID ${place.id}; falling back to defaultPrefix.default`
			);
			return this.defaultPrefix.default;
		}

		return prefix;
	}

	getDefaultPrefixFallback(place?: Place): string {
		switch (place?.platform) {
			case "discord":
				return this.defaultPrefix.discord;
			case "twitch":
				return this.defaultPrefix.twitch;
		}
		return this.defaultPrefix.default;
	}

	get defaultPlaceFallback(): Place {
		return {
			id: "default",
			platform: "none",
		};
	}

	/**
	 * Returns a list of prefixes that the command can use.
	 *
	 * @param placeOrPlatformId Place data, or a platform ID (ex. Discord guild ID, Twitch channel ID)
	 * @param checkDefault Checks if the default prefix is duplicated in the array
	 */
	getPrefixes(
		placeOrPlatformId: Place | string,
		checkDefault = true
	): string[] {
		const prefixes: string[] = [];

		// Puts all the command prefixes in an array
		if (this.rawInfo.prefixes) {
			prefixes.push(...this.rawInfo.prefixes);
		}

		// Get's this place's prefixes, and puts them into the array
		// for comparing if it contains the default prefix
		let place =
			typeof placeOrPlatformId == "string"
				? this.client.provider.places.get(placeOrPlatformId)
				: placeOrPlatformId;

		if (!place) {
			Logger.warn(
				oneLine`place for place ID ${placeOrPlatformId} wasn't found!`
			);
			place = this.defaultPlaceFallback;
		}

		if (checkDefault) {
			// Gets the default prefix
			const prefix = this.getDefaultPrefix(place);

			// If this list doesn't include the default prefix from there, add it to the array
			if (prefix && !prefixes.includes(prefix)) {
				prefixes.push(prefix);
			}
		}

		return prefixes;
	}

	/**
	 * Puts all text entry fields into formatting
	 *
	 * @param place Place data
	 */
	getCommandNotationFormatting(
		place: Place
	): {
		about: string | undefined;
		description: string | undefined;
		examples: string | undefined;
		notes: string | undefined;
		usage: string | undefined;
	} {
		return {
			about: this.client.formatting.formatCommandNotation(
				this.about,
				this,
				place
			),
			description: this.client.formatting.formatCommandNotation(
				this.description,
				this,
				place
			),
			examples: this.client.formatting.formatCommandNotation(
				this.examples,
				this,
				place
			),
			notes: this.client.formatting.formatCommandNotation(
				this.notes,
				this,
				place
			),
			usage: this.client.formatting.formatCommandNotation(
				this.usage,
				this,
				place
			),
		};
	}

	/**
	 * Run the command.
	 *
	 * @param msg Framed Message
	 *
	 * @returns true if successful
	 */
	abstract run(msg: BaseMessage): Promise<boolean>;

	//#region Permissions

	/**
	 * Shows data for if a user has a permission to do something.
	 *
	 * NOTE: If userPermissions is undefined, this will return a success.
	 *
	 * @param msg
	 * @param userPermissions
	 * @param checkAdmin
	 * @param checkOwner
	 */
	checkForPermissions(
		msg: BaseMessage,
		userPermissions = this.userPermissions,
		checkAdmin = true,
		checkOwner = true
	): UserPermissionAllowedData | UserPermissionDeniedData {
		if (!userPermissions) {
			// If the command doesn't specify permissions, assume it's fine
			return {
				success: true,
			};
		}

		if (msg instanceof DiscordMessage) {
			const reasons: UserPermissionDeniedReasons[] = [];

			// Bot owners always have permission
			if (msg.client.discord.botOwners.includes(msg.discord.author.id)) {
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
			const passedUserCheck = userPermissions.discord.users?.includes(
				msg.discord.author.id
			);
			// Checks for false, not undefined
			if (passedUserCheck == false) {
				reasons.push("discordUser");
			} else if (passedUserCheck == true) {
				return { success: true };
			}

			const member = msg.discord.member;
			if (member) {
				// Stores if some checks has already passed
				let hasRole = false;
				let hasPermission = false;

				const perms = userPermissions.discord.permissions
					? userPermissions.discord.permissions
					: new Discord.Permissions();

				hasPermission = member.hasPermission(perms, {
					checkAdmin,
					checkOwner,
				});

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
				return { success: false, reasons: ["discordDMs"] };
			}
		} else if (msg instanceof TwitchMessage) {
			// TODO: Twitch Message permissions
			Logger.warn("Twitch permissions haven't been implemented");
			return { success: true };
		}

		// Return false by default, just in case
		return { success: false, reasons: ["unknown"] };
	}

	/**
	 * Checks for if a user has a permission to do something.
	 *
	 * NOTE: If userPermissions is undefined, this returns true.
	 *
	 * @param msg
	 * @param userPermissions
	 * @param checkAdmin
	 * @param checkOwner
	 */
	hasPermission(
		msg: BaseMessage,
		userPermissions = this.userPermissions,
		checkAdmin = true,
		checkOwner = true
	): boolean {
		return this.checkForPermissions(
			msg,
			userPermissions,
			checkAdmin,
			checkOwner
		).success;
	}

	/**
	 * Sends an error message, with what perms the user needs to work with.
	 *
	 * @param msg
	 * @param permissions
	 */
	async sendPermissionErrorMessage(
		msg: BaseMessage,
		permissions = this.userPermissions,
		deniedData = this.checkForPermissions(msg, permissions)
	): Promise<boolean> {
		if (deniedData.success) {
			throw new Error(
				"deniedData should have been denied; deniedData.success was true"
			);
		}

		if (msg.discord) {
			const discord = msg.discord;
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			)
				.setTitle("Permission Denied")
				.setDescription(
					`${msg.discord.author}, you aren't allowed to do that!`
				);

			const missingMessage = oneLine`${embed.description}
			You are missing and/or aren't:`;

			for (const reason of deniedData.reasons) {
				switch (reason) {
					case "botOwnersOnly":
						embed.setDescription(
							oneLine`${embed.description}
							Only the bot owner(s) are.`
						);
						break;
					case "discordNoData":
						embed.setDescription(
							oneLine`${embed.description} User permissions were
							specified, but there was no specific Discord
							permission data entered. By default, this will deny
							permissions to anyone but bot owners.`
						);
						break;
					case "discordDMs":
						embed.setDescription(
							oneLine`${embed.description} There are certain member
							permissions needed to run this. Try running this
							command again, but on a Discord server.`
						);
						break;
					case "discordMissingPermissions":
						if (permissions?.discord?.permissions) {
							// Gets user's permissions and missing permissions
							const userPerms = new Discord.Permissions(
								msg.discord.member?.permissions
							);
							const missingPerms = userPerms.missing(
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
							}

							embed
								.setDescription(oneLine`${missingMessage}`)
								.addField(
									"Discord Permissions",
									missingPermsString
								);
						} else {
							embed.setDescription(
								oneLine`${embed.description} I think there are
								missing permissions, but there are no permissions
								to check with. Something went wrong!`
							);
						}
						break;
					case "discordMissingRole":
						// Goes through roles
						if (permissions?.discord?.roles) {
							const roles: string[] = [];
							for (const role of permissions.discord.roles) {
								// Correctly parses the resolvable
								if (typeof role == "string") {
									const newRole = discord.guild?.roles.cache.get(
										role
									);
									if (!newRole) {
										Logger.error(oneLine`BaseCommand.ts:
										Couldn't find role with role ID "${role}".`);
									}
									roles.push(`${newRole}` ?? `<@&${role}>`);
								} else {
									roles.push(`${role}`);
								}
							}

							if (roles.length > 0) {
								embed
									.setDescription(missingMessage)
									.addField(
										"Discord Roles",
										oneLineInlineLists`${roles}`
									);
								break;
							}
						}

						// If the above didn't set anything, show this instead
						embed.setDescription(oneLine`${embed.description}
						I think you are missing a role, but there's no
						roles for me to check with. Something went wrong!`);

						break;
					case "discordUser":
						if (permissions?.discord?.users) {
							const listOfUsers: string[] = [];

							for (const user of permissions.discord.users) {
								listOfUsers.push(`<@${user}>`);
							}

							embed
								.setDescription(missingMessage)
								.addField(
									"Users",
									oneLineCommaListsOr`${listOfUsers}`
								);
						}
						break;
					default:
						embed.setDescription(oneLine`${embed.description}
						The specified reason is not known. Something went wrong!`);
						break;
				}
			}

			await msg.discord.channel.send(embed);
			return true;
		} else {
			await msg.send("Something went wrong when checking permissions!");
			return false;
		}
	}

	//#endregion

	//#region Loading in the subcommand

	/**
	 * Loads the plugins
	 * @param options RequireAll options
	 */
	loadSubcommandsIn(options: Options): void {
		try {
			const subcommands = DiscordUtils.importScripts(options) as (new (
				command: BaseCommand
			) => BaseSubcommand)[];
			this.loadSubcommands(subcommands);
		} catch (error) {
			Logger.error(error.stack);
		}
	}

	/**
	 *
	 * @param subcommands
	 */
	loadSubcommands<T extends BaseSubcommand>(
		subcommands: (new (command: BaseCommand) => T)[]
	): void {
		for (const subcommand of subcommands) {
			const initSubcommand = new subcommand(this);
			this.loadSubcommand(initSubcommand);
		}
	}

	/**
	 *
	 * @param subcommand
	 */
	loadSubcommand<T extends BaseSubcommand>(subcommand: T): void {
		// Sets up the subcommand into the Map
		if (this.subcommands.get(subcommand.id)) {
			Logger.error(`Subcommand with id ${subcommand.id} already exists!`);
			return;
		}
		this.subcommands.set(subcommand.id, subcommand);

		if (subcommand.aliases) {
			for (const alias of subcommand.aliases) {
				if (this.subcommandAliases.get(alias)) {
					Logger.error(
						`Alias "${alias}" from subcommand "${subcommand.fullId}" already exists!`
					);
					continue;
				}
				this.subcommandAliases.set(alias, subcommand);
			}
		}

		Logger.debug(`Loaded subcommand ${subcommand.id}`);
	}

	//#endregion

	/**
	 * Gets the subcommand to run from command arguments.
	 *
	 * @param args Message arguments. This should likely equal
	 * `msg.args` from the Message class.
	 *
	 * @returns Subcommand or undefined
	 */
	getSubcommand(args: string[]): BaseSubcommand | undefined {
		const maxSubcommandNesting = 3;
		let finalSubcommand: BaseSubcommand | undefined;
		let newSubcommand: BaseSubcommand | undefined;

		for (let i = 0; i < maxSubcommandNesting + 1; i++) {
			const commandToCompare = newSubcommand ? newSubcommand : this;
			let subcommand = commandToCompare.subcommands.get(args[i]);
			if (!subcommand)
				subcommand = commandToCompare.subcommandAliases.get(args[i]);

			if (subcommand) {
				// If it hit max and isn't done
				if (i == maxSubcommandNesting) {
					Logger.error(oneLine`
					There are too many nested subcommands! The maximum is 3.
					The ${finalSubcommand?.fullId} subcommand will be ran anyway.`);
					break;
				}

				// Else, simply add it as a possible subcommand
				newSubcommand = subcommand;
			} else if (newSubcommand) {
				// Gets the previous new command as the final one, to be ran
				finalSubcommand = newSubcommand;
				break;
			} else {
				// There was no subcommand, so we return undefined
				return undefined;
			}
		}

		// If there was a final subcommand, return it
		if (finalSubcommand) {
			return finalSubcommand;
		}
	}

	/**
	 * Gets the nested subcommands.
	 *
	 * @param args Message arguments
	 */
	getSubcommandChain(args: string[]): BaseSubcommand[] {
		const maxSubcommandNesting = 3;
		const subcommands: BaseSubcommand[] = [];

		let finalSubcommand: BaseSubcommand | undefined;
		let newSubcommand: BaseSubcommand | undefined;

		for (let i = 0; i < maxSubcommandNesting + 1; i++) {
			const commandToCompare = newSubcommand ? newSubcommand : this;
			let subcommand = commandToCompare.subcommands.get(args[i]);
			if (!subcommand)
				subcommand = commandToCompare.subcommandAliases.get(args[i]);

			if (subcommand) {
				// If it hit max and isn't done
				if (i == maxSubcommandNesting) {
					Logger.error(oneLine`
					There are too many nested subcommands! The maximum is 3.
					The ${finalSubcommand?.fullId} subcommand will be ran anyway.`);
					break;
				}

				// Else, simply add the new subcommand to our list
				subcommands.push(subcommand);
				newSubcommand = subcommand;
			} else {
				// There are no new subcommand, so we return the array
				return subcommands;
			}
		}

		return subcommands;
	}
}
