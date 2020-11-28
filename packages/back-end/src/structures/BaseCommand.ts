import FramedMessage from "./FramedMessage";
import { BasePlugin } from "./BasePlugin";
import FramedClient from "./FramedClient";
import { CommandInfo } from "../interfaces/CommandInfo";
import Discord from "discord.js";
import { FramedPermissions } from "./FramedPermissions";
import EmbedHelper from "../utils/discord/EmbedHelper";
import { logger } from "shared";

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
	 * Permissions
	 */
	permissions?: FramedPermissions;

	/**
	 * Emoji icon when shown in the help embed.
	 */
	emojiIcon?: string;

	/**
	 * The embed inline character limit, before it becomes not inline in the help embed.
	 */
	inlineCharacterLimit?: number;

	/**
	 * Create a new BaseCommand.
	 * @param plugin Plugin that this command will be attached to
	 * @param info Command information
	 */
	constructor(plugin: BasePlugin, info: CommandInfo) {
		this.framedClient = plugin.framedClient;
		this.plugin = plugin;

		this.id = info.id.toLocaleLowerCase();
		this.fullId = `${this.plugin.id}.command.${this.id}`;
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
		this.emojiIcon = info.emojiIcon;
		this.inlineCharacterLimit = info.inlineCharacterLimit;

		if (this.examples) {
			this.examples = this.examples?.replace(
				/{{prefix}}/gi,
				this.defaultPrefix
			);
		}
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
			const embed = EmbedHelper.getEmbedTemplate(
				msg.discord,
				this.framedClient,
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
						`${embed.description}\nYou need one of the following permissions:`
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
}
