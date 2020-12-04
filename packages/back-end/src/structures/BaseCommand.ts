import FramedMessage from "./FramedMessage";
import { BasePlugin } from "./BasePlugin";
import FramedClient from "./FramedClient";
import { CommandInfo } from "../interfaces/CommandInfo";
import Discord from "discord.js";
import { FramedPermissions } from "./FramedPermissions";
import EmbedHelper from "../utils/discord/EmbedHelper";
import { logger } from "shared";
import Options from "../interfaces/RequireAllOptions";
import DiscordUtils from "../utils/discord/DiscordUtils";
import BaseSubcommand from "./BaseSubcommand";
import { oneLine } from "common-tags";

export abstract class BaseCommand {
	readonly framedClient: FramedClient;

	/**
	 * The plugin this command is attached to.
	 */
	plugin: BasePlugin;

	/**
	 * Stores an ID for the command that should be completely unique between plugins.
	 */
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

	/**
	 * The command tries to import scripts from paths found in this object.
	 */
	paths?: {
		subcommands?: string;
	};

	/**
	 * Subcommands.
	 */
	subcommands: Map<string, BaseSubcommand>;

	/**
	 * Stores a list of command aliases possible to trigger the command.
	 */
	aliases?: string[];

	/**
	 * The default prefix of the command. This will be seen on the help embed.
	 */
	defaultPrefix: string;

	/**
	 * A list of all possible prefixes.
	 */
	prefixes: string[];

	/**
	 * Group name
	 */
	group: string;

	/**
	 * Group emote
	 */
	groupEmote?: string;

	/**
	 * A brief, one-liner about section to talk about what the command does.
	 */
	about?: string;

	/**
	 * A description of what the command does. This is encouraged to span multiple lines.
	 */
	description?: string;

	/**
	 * Info on how to use the command.
	 */
	usage?: string;

	/**
	 * Should this command hide its usage instructions on the help embed?
	 */
	hideUsageInHelp?: boolean;

	/**
	 * Examples on how to use the command.
	 */
	examples?: string;

	/**
	 * Permissions to compare to.
	 *
	 * WARNING: YOU NEED TO CHECK FOR THESE MANUALLY. See `hasPermission()` on how to do this.
	 * It is also recommended you send a permission denied message too with `sendPermissionErrorMessage()`.
	 *
	 * Example:
	 *
	 * ```ts
	 * const hasPermission = this.hasPermission(msg);
	 * if (!hasPermission) {
	 * 	await this.sendPermissionErrorMessage(msg);
	 * 	return false;
	 * }
	 * // Continues on, if it passes the permission check...
	 * ```
	 */
	permissions?: FramedPermissions;

	/**
	 * The embed inline character limit, before it becomes not inline in the help embed.
	 */
	inlineCharacterLimit?: number;

	/**
	 * Use inline in help?
	 */
	inline: boolean;

	/**
	 * Use inline in help?
	 */
	inlineAliases: boolean;

	/**
	 * This variable contains the raw info of what a plugin has returned as data. This data may be incomplete,
	 * or may have not been parsed yet. The constructor of BaseCommand is designed
	 * to parse it all at once.
	 *
	 * **DO NOT USE THIS** unless you're re-constructing through the constructor,
	 * or know what you're doing.
	 *
	 * If you're unsure whether to use this, **USE THE BASE VARIABLES INSTEAD**.
	 */
	rawInfo: CommandInfo;

	/**
	 * Create a new BaseCommand.
	 * @param plugin Plugin that this command will be attached to
	 * @param info Command information
	 */
	constructor(plugin: BasePlugin, info: CommandInfo) {
		this.framedClient = plugin.framedClient;
		this.plugin = plugin;

		this.id = info.id.toLocaleLowerCase();
		this.paths = info.paths;
		this.fullId = `${this.plugin.id}.command.${this.id}`;
		this.group = info.group	? info.group : plugin.group ? plugin.group : "Other";
		this.groupEmote = plugin.groupEmote;
		this.aliases = info.aliases;
		this.defaultPrefix =
			info.defaultPrefix != undefined
				? info.defaultPrefix
				: plugin.defaultPrefix;

		// Prefixes array logic
		if (!info.prefixes) {
			// Info.prefixes will have a value, and cannot be undefined
			info.prefixes = [];
		}

		this.prefixes = info.prefixes;

		// If this list doesn't include the default prefix, add it
		if (!this.prefixes.includes(this.defaultPrefix)) {
			this.prefixes.push(this.defaultPrefix);
		}

		this.about = info.about;
		this.description = info.description;
		this.usage = info.usage;
		this.hideUsageInHelp = info.hideUsageInHelp;
		this.examples = info.examples;
		this.permissions = info.permissions;
		this.inlineCharacterLimit = info.inlineCharacterLimit;

		if (this.examples) {
			this.examples = this.examples?.replace(
				/{{prefix}}/gi,
				this.defaultPrefix
			);
		}

		this.inline = info.inline ? info.inline : false;
		this.inlineAliases = info.inlineAliases ? info.inlineAliases : false;

		this.rawInfo = info;
		this.subcommands = new Map();
	}

	/**
	 * Run the command.
	 * @param msg Framed Message
	 */
	abstract async run(msg: FramedMessage): Promise<boolean>;

	/**
	 * Sends an error message, with what perms the user needs to work with.
	 *
	 * @param msg
	 * @param permissions
	 */
	async sendPermissionErrorMessage(
		msg: FramedMessage,
		permissions = this.permissions
	): Promise<boolean> {
		if (msg.discord && permissions?.discord) {
			const discord = msg.discord;
			const embedFields: Discord.EmbedFieldData[] = [];
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				this.framedClient.helpCommands,
				this.id
			)
				.setTitle("Permission Denied")
				.setDescription(
					`${msg.discord.author}, you aren't allowed to do that! `
				);

			// TODO: Finish
			if (permissions.discord.permissions) {
				const perms = new Discord.Permissions(
					permissions.discord.permissions
				);
				const permsArray = perms.toArray();
				let value = "";

				// Puts Discord permissions into a string
				permsArray.forEach(permString => {
					value += `\`${permString}\` `;
				});

				if (value.length > 0) {
					embedFields.push({
						name: "Discord Permissions",
						value,
					});
				}
			}

			// Goes through roles
			if (permissions.discord.roles) {
				const roles: Discord.Role[] = [];
				permissions.discord.roles.forEach(role => {
					// Correctly parses the resolvable
					if (typeof role == "string") {
						const newRole = discord.guild?.roles.cache.get(role);
						if (newRole) {
							roles.push(newRole);
						} else {
							logger.error(
								`BaseCommand.ts: Couldn't find role with role ID "${role}".`
							);
						}
					} else {
						roles.push(role);
					}
				});

				let value = "";
				for await (const role of roles) {
					value += `${role} `;
				}

				if (value.length > 0) {
					embedFields.push({
						name: "Discord Roles",
						value,
					});
				}
			}

			if (embedFields.length > 0) {
				embed
					.setDescription(
						`${embed.description}\nYou need the following permissions or roles:`
					)
					.addFields(embedFields);
			}

			await msg.discord.channel.send(embed);
			return true;
		}
		return false;
	}

	/**
	 * Checks for if a user has a permission to do something.
	 *
	 * NOTE: If permissions is null, this returns true.
	 *
	 * @param msg
	 * @param permissions
	 * @param checkAdmin
	 * @param checkOwner
	 */
	hasPermission(
		msg: FramedMessage,
		permissions = this.permissions,
		checkAdmin = true,
		checkOwner = true
	): boolean {
		if (permissions) {
			// Discord checks
			if (permissions.discord && msg.discord) {
				const member = msg.discord.member;
				if (member) {
					// Discord permissions
					let hasPermission = false;
					const perms = permissions.discord.permissions
						? permissions.discord.permissions
						: new Discord.Permissions("ADMINISTRATOR");

					hasPermission = member.hasPermission(perms, {
						checkAdmin,
						checkOwner,
					});

					// Goes through Discord roles, if the permission wasn't granted
					if (!hasPermission && permissions.discord.roles) {
						permissions.discord.roles.every(role => {
							let roleId = "";
							if (role instanceof Discord.Role) {
								roleId = role.id;
							} else {
								roleId = role;
							}

							hasPermission = member.roles.cache.has(roleId);
							if (hasPermission) {
								return;
							}
						});
					}

					return hasPermission;
				} else {
					// It should've catched even with DM
					return false;
				}
			}

			// Return false by default
			return false;
		} else {
			// If the command doesn't specify permissions, assume it's fine
			return true;
		}
	}

	/**
	 * Loads the plugins
	 * @param options RequireAll options
	 */
	loadSubcommandsIn(options: Options): void {
		try {
			const subcommands = DiscordUtils.importScripts(options);
			this.loadSubcommands(subcommands);
		} catch (error) {
			logger.error(error.stack);
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
		if (this.subcommands.get(subcommand.id)) {
			logger.error(`Subcommand with id ${subcommand.id} already exists!`);
			return;
		}

		this.subcommands.set(subcommand.id, subcommand);

		logger.debug(`Finished loading subcommand ${subcommand.id}.`);
	}

	/**
	 * Gets the subcommand to run from command arguments.
	 *
	 * @param command Base command
	 * @param args Arguments represetned as a string. Likely
	 * should equal `msg.args` from FramedMessage.
	 *
	 * @returns BaseSubcommand or undefined
	 */
	static getSubcommand(
		command: BaseCommand,
		args: string[]
	): BaseSubcommand | undefined {
		const maxSubcommandNesting = 3;
		let finalSubcommand: BaseSubcommand | undefined;
		let newSubcommand: BaseSubcommand | undefined;

		for (let i = 0; i < maxSubcommandNesting + 1; i++) {
			let subcommand = command.subcommands.get(args[i]);

			// If it can't be found, check the all of the command's
			// subcommand aliases
			if (!subcommand) {
				command.subcommands.forEach(element => {
					if (element.aliases?.includes(args[i])) {
						subcommand = element;
					}
				});
			}

			if (subcommand) {
				// If it hit max and isn't done
				if (i == maxSubcommandNesting) {
					logger.error(oneLine`
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
	 * Gets the subcommand to run from command arguments.
	 *
	 * @param args Message arguments
	 */
	getSubcommand(args: string[]): BaseSubcommand | undefined {
		return BaseCommand.getSubcommand(this, args);
	}

	/**
	 * Gets the nested subcommands.
	 *
	 * @param command Base command
	 * @param args Message arguments
	 */
	static getSubcommandChain(
		command: BaseCommand,
		args: string[]
	): BaseSubcommand[] {
		const maxSubcommandNesting = 3;
		const subcommands: BaseSubcommand[] = [];
		let finalSubcommand: BaseSubcommand | undefined;

		for (let i = 0; i < maxSubcommandNesting + 1; i++) {
			const element = command.subcommands.get(args[i]);

			if (element) {
				// If it hit max and isn't done
				if (i == maxSubcommandNesting) {
					logger.error(oneLine`
					There are too many nested subcommands! The maximum is 3.
					The ${finalSubcommand?.fullId} subcommand will be ran anyway.`);
					break;
				}

				// Else, simply add the new subcommand to our list
				subcommands.push(element);
			} else {
				// There are no new subcommand, so we return the array
				return subcommands;
			}
		}

		return subcommands;
	}

	getSubcommandChain(args: string[]): BaseSubcommand[] {
		return BaseCommand.getSubcommandChain(this, args);
	}
}
