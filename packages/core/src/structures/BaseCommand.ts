import { Message } from "./Message";
import { BasePlugin } from "./BasePlugin";
import { Client } from "./Client";
import { BaseCommandOptions } from "../interfaces/BaseCommandOptions";
import Discord from "discord.js";
import { Permissions } from "./Permissions";
import { EmbedHelper } from "../utils/discord/EmbedHelper";
import { Logger } from "@framedjs/logger";
import Options from "../interfaces/other/RequireAllOptions";
import { DiscordUtils } from "../utils/discord/DiscordUtils";
import { BaseSubcommand } from "./BaseSubcommand";
import { oneLine } from "common-tags";
import { Prefixes } from "../interfaces/Prefixes";

export abstract class BaseCommand {
	// static readonly type: string = "BaseCommand";

	readonly client: Client;

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
	 * Subcommands aliases
	 */
	subcommandAliases: Map<string, BaseSubcommand>;

	/**
	 * Stores a list of command aliases possible to trigger the command.
	 */
	aliases?: string[];

	/**
	 * The default prefix of the command. This will be seen on the help embed.
	 */
	defaultPrefix: Prefixes;

	/**
	 * A list of all possible prefixes.
	 */
	// prefixes: string[];

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
	 * Extra notes about the command, that isn't in the description.
	 */
	notes?: string;

	/**
	 * Permissions to compare to.
	 *
	 * **WARNING: YOU NEED TO CHECK FOR THESE MANUALLY.** See `hasPermission()` on how to do this.
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
	permissions?: Permissions;

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
	rawInfo: BaseCommandOptions;

	/**
	 * Create a new BaseCommand.
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
		} else if (info.defaultPrefix != undefined) {
			this.defaultPrefix = info.defaultPrefix;
		} else {
			this.defaultPrefix = {
				discord: this.client.discord.defaultPrefix,
				twitch: this.client.twitch.defaultPrefix,
				default: this.client.defaultPrefix,
			};
		}

		// Prefixes array logic
		// if (!info.prefixes) {
		// 	// Info.prefixes will have a value, and cannot be undefined
		// 	info.prefixes = [];
		// }

		// this.prefixes = info.prefixes;

		// // If this list doesn't include the default prefix, add it
		// if (!this.prefixes.includes(this.defaultPrefix)) {
		// 	this.prefixes.push(this.defaultPrefix);
		// }

		this.about = info.about;
		this.description = info.description;
		this.usage = info.usage;
		this.examples = info.examples;
		this.notes = info.notes;
		this.permissions = info.permissions;
		this.hideUsageInHelp = info.hideUsageInHelp;
		this.inlineCharacterLimit = info.inlineCharacterLimit;

		this.inline = info.inline ? info.inline : false;
		this.inlineAliases = info.inlineAliases ? info.inlineAliases : false;

		this.rawInfo = info;
		this.subcommands = new Map();
		this.subcommandAliases = new Map();
	}

	getDefaultPrefix(guildOrTwitchId = "default"): string {
		const prefix = this.client.getGuildOrTwitchIdPrefix(
			"default",
			guildOrTwitchId
		);
		if (!prefix) {
			Logger.warn(
				"Couldn't find default prefix from client; falling back to defaultPrefix.default"
			);
			return this.defaultPrefix.default;
		}
		return prefix;
	}

	/**
	 * Returns a list of prefixes that the command can use.
	 *
	 * @param guildOrTwitchId
	 */
	getPrefixes(guildOrTwitchId = "default"): string[] {
		const prefixes: string[] = [];

		// Puts all the command prefixes in an array
		if (this.rawInfo.prefixes) {
			prefixes.push(...this.rawInfo.prefixes);
		}

		// Filters matching guildOrTwitchIds, then
		// Puts all those matching prefixes into an array
		this.client.guildOrTwitchIdPrefixesArray
			.filter(
				thisGuildOrTwitchId =>
					thisGuildOrTwitchId[0][1] == guildOrTwitchId
			)
			.forEach(newPrefix => {
				const value = newPrefix[1];
				prefixes.push(value);
			});

		// Gets the default prefix from the guild or Twitch channel
		const prefix = this.client.getGuildOrTwitchIdPrefix(
			"default",
			guildOrTwitchId
		);

		// If this list doesn't include the default prefix from there, add it to the array
		if (prefix && !prefixes.includes(prefix)) {
			prefixes.push(prefix);
		}

		return prefixes;
	}

	getCommandNotationFormatting(
		guildOrTwitchId = "default"
	): {
		about: string | undefined;
		description: string | undefined;
		examples: string | undefined;
		notes: string | undefined;
		usage: string | undefined;
	} {
		return {
			about: this.client.formatting.formatCommandNotation(
				this,
				this.about,
				guildOrTwitchId
			),
			description: this.client.formatting.formatCommandNotation(
				this,
				this.description,
				guildOrTwitchId
			),
			examples: this.client.formatting.formatCommandNotation(
				this,
				this.examples,
				guildOrTwitchId
			),
			notes: this.client.formatting.formatCommandNotation(
				this,
				this.notes,
				guildOrTwitchId
			),
			usage: this.client.formatting.formatCommandNotation(
				this,
				this.usage,
				guildOrTwitchId
			),
		};
	}

	/**
	 * Parses custom $() formatting
	 */
	async formatBatch(): Promise<void> {
		// const keys: string[] = [];
		// const queue = new Map<string, Promise<string>>();
		// const addToQueue = (name: string, text?: string): void => {
		// 	if (!text) return;
		// 	keys.push(name);
		// 	queue.set(name, Message.format(text, this.client));
		// };
		// addToQueue("examples", this.examples);
		// addToQueue("usage", this.usage);
		// addToQueue("about", this.about);
		// addToQueue("description", this.description);
		// const settledQueue = await Promise.allSettled(queue.values());
		// const finalKeys = [...queue.keys()];
		// const finalSettledQueue = [...settledQueue];
		// for (let i = 0; i < finalKeys.length; i++) {
		// 	const finalKey = finalKeys[i];
		// 	const finalQueue = finalSettledQueue[i];
		// 	if (finalQueue.status == "fulfilled") {
		// 		const matchingKey = keys.find(k => k == finalKey);
		// 		if (matchingKey) {
		// 			switch (matchingKey) {
		// 				case "examples":
		// 					this.examples = finalQueue.value;
		// 					break;
		// 				case "usage":
		// 					this.usage = finalQueue.value;
		// 					break;
		// 				case "about":
		// 					this.about = finalQueue.value;
		// 					break;
		// 				case "description":
		// 					this.description = finalQueue.value;
		// 					break;
		// 				default:
		// 					Logger.error(
		// 						`BaseCommand.ts: Key "${finalKey}" is unknown`
		// 					);
		// 					break;
		// 			}
		// 		}
		// 	} else {
		// 		Logger.error(
		// 			`BaseCommand.ts: ${finalQueue.status} - ${finalQueue.reason}`
		// 		);
		// 	}
		// }
	}

	/**
	 * Run the command.
	 *
	 * @param msg Framed Message
	 *
	 * @returns true if successful
	 */
	abstract run(msg: Message): Promise<boolean>;

	//#region Permissions

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
		msg: Message,
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
	 * Sends an error message, with what perms the user needs to work with.
	 *
	 * @param msg
	 * @param permissions
	 */
	async sendPermissionErrorMessage(
		msg: Message,
		permissions = this.permissions
	): Promise<boolean> {
		if (msg.discord && permissions?.discord) {
			const discord = msg.discord;
			const embedFields: Discord.EmbedFieldData[] = [];
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				this.client.helpCommands,
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
							Logger.error(
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
