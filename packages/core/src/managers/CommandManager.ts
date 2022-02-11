import { Logger } from "@framedjs/logger";
import { Utils } from "@framedjs/shared";
import { oneLine, oneLineCommaListsOr, oneLineInlineLists } from "common-tags";

import { Base } from "../structures/Base";
import { BaseCommand } from "../structures/BaseCommand";
import { BaseDiscordInteraction } from "../structures/BaseDiscordInteraction";
import { BaseDiscordAutocompleteInteraction } from "../structures/BaseDiscordAutocompleteInteraction";
import { BaseDiscordButtonInteraction } from "../structures/BaseDiscordButtonInteraction";
import { BaseDiscordContextMenuInteraction } from "../structures/BaseDiscordContextMenuInteraction";
import { BaseDiscordMessageComponentInteraction } from "../structures/BaseDiscordMessageComponentInteraction";
import { BaseDiscordSelectMenuInteraction } from "../structures/BaseDiscordSelectMenuInteraction";
import { BaseMessage } from "../structures/BaseMessage";
import { DiscordCommandInteraction } from "../structures/DiscordCommandInteraction";
import { DiscordInteraction } from "../structures/DiscordInteraction";
import { DiscordMessage } from "../structures/DiscordMessage";
import { Client } from "../structures/Client";
import { EmbedHelper } from "../utils/discord/EmbedHelper";
import { FriendlyError } from "../structures/errors/FriendlyError";
import { TwitchMessage } from "../structures/TwitchMessage";

import type { FoundCommandData } from "../interfaces/FoundCommandData";
import type { Place } from "../interfaces/Place";

import Discord from "discord.js";
import type {
	BotPermissionAllowedData,
	BotPermissionDeniedData,
} from "../interfaces/BotPermissionData";

export class CommandManager extends Base {
	constructor(client: Client) {
		super(client);
	}

	/**
	 * List of all the default prefixes
	 *
	 * @returns String array of default prefixes
	 */
	get defaultPrefixes(): string[] {
		const prefixes: string[] = [
			`<@!${this.client.discord.client?.user?.id}>`,
			`<@${this.client.discord.client?.user?.id}>`,
		];

		// Logger.debug(`Default prefixes: ${prefixes}`);
		return prefixes;
	}

	/**
	 * BaseCommand array
	 *
	 * @returns List of all the base commands from all plugins
	 */
	get commandsArray(): BaseCommand[] {
		const commands: BaseCommand[] = [];
		this.client.plugins.map.forEach(plugin => {
			commands.push(...Array.from(plugin.commands.values()));
		});
		return commands;
	}

	/**
	 * List of all possible prefixes for the specific guild or Twitch channel.
	 *
	 * @param place Place data
	 * @param guild Discord Guild, for the role prefix
	 *
	 * @returns String array of all possible prefixes
	 */
	getPossiblePrefixes(place: Place, guild?: Discord.Guild | null): string[] {
		// const startTime = process.hrtime();
		const prefixes = this.defaultPrefixes;

		// From commands: adds to the list of potential prefixes (also removes duplicates)
		for (const command of this.commandsArray) {
			const commandPrefixes = command.getPrefixes(place);
			for (const prefix of commandPrefixes) {
				if (!prefixes.includes(prefix)) {
					// Logger.silly(`[${process.hrtime(startTime)}] - ${prefix}`);
					prefixes.push(prefix);
				}
			}
		}

		if (guild && guild.available) {
			const rolePrefix = guild.me?.roles.botRole?.toString();
			if (rolePrefix) {
				prefixes.push(rolePrefix);
			}
		}

		// Logger.silly(
		// 	`${Utils.hrTimeElapsed(
		// 		startTime
		// 	)}s - Finished finding all possible prefixes.`
		// );
		// Logger.silly(process.hrtime(startTime));
		// Logger.silly(`Prefixes: ${prefixes}`);
		return prefixes;
	}

	/**
	 * Retrieves the bot's automatic role for a prefix
	 *
	 * @param guild Discord Guild
	 *
	 * @deprecated Use guild.me.roles.botRole.toString() instead.
	 */
	getBotRolePrefix(guild: Discord.Guild): string | undefined {
		const roles = guild.roles;
		const botRole = roles.cache.find(
			a => a.name === guild.me?.user.username
		);

		if (botRole) {
			return botRole.toString();
		}
	}

	//#region Getting commands

	/**
	 *
	 * @param msg Framed message
	 */
	async getFoundCommandData(
		msg: BaseMessage,
		place: Place
	): Promise<FoundCommandData[]>;

	/**
	 *
	 * @param prefix
	 * @param command
	 * @param args
	 */
	async getFoundCommandData(
		command: string,
		args: string[],
		place: Place,
		prefix?: string
	): Promise<FoundCommandData[]>;

	/**
	 *
	 * @param msgOrCommand
	 * @param args
	 * @param prefix
	 */
	async getFoundCommandData(
		msgOrCommand: BaseMessage | string,
		argsOrPlace?: string[] | Place,
		place?: Place,
		prefix?: string
	): Promise<FoundCommandData[]> {
		let command: string;
		let args: string[];

		if (msgOrCommand instanceof BaseMessage) {
			if (msgOrCommand.command != undefined) {
				prefix = msgOrCommand.prefix;
				command = msgOrCommand.command;
				args = msgOrCommand.args ? msgOrCommand.args : [];
				place = place ? place : await msgOrCommand.getPlace();
			} else {
				throw new Error(`Command parameter in Message was undefined`);
			}
		} else {
			if (!(argsOrPlace instanceof Array)) {
				throw new Error(
					`argsOrPlace must be an Array, if msgOrComamnd is a string`
				);
			}

			command = msgOrCommand;
			args = argsOrPlace;

			if (!place) {
				throw new ReferenceError("Variable place is undefined");
			}
		}

		const data: FoundCommandData[] = [];

		// Runs the commands
		let commandList: BaseCommand[] = [];
		if (msgOrCommand instanceof BaseMessage) {
			commandList = this.getCommands(msgOrCommand, place);
		} else {
			commandList = this.getCommands(command, place, prefix);
		}

		for (const command of commandList) {
			const element: FoundCommandData = {
				command: command,
				subcommands: [],
			};

			element.subcommands = command.getSubcommandChain(args);
			data.push(element);
		}

		return data;
	}

	/**
	 * Gets a command
	 *
	 * @param command Command ID
	 * @param place Place data
	 * @param prefix Prefix
	 *
	 * @returns BaseCommand or undefined
	 */
	getCommand(
		command: string,
		place?: Place,
		prefix?: string
	): BaseCommand | undefined;

	/**
	 * Gets a command
	 *
	 * @param msg Framed Message
	 * @param place Place data
	 *
	 * @returns BaseCommand or undefined
	 */
	getCommand(msg: BaseMessage, place?: Place): BaseCommand | undefined;

	/**
	 * Gets a command
	 *
	 * @param msgOrCommand Framed Message or command string
	 * @param place Place data
	 * @param prefix Prefix
	 *
	 * @returns BaseCommand or undefined
	 */
	getCommand(
		msgOrCommand: BaseMessage | string,
		place?: Place,
		prefix?: string
	): BaseCommand | undefined {
		if (msgOrCommand instanceof BaseMessage) {
			return this.getCommands(msgOrCommand, place)[0];
		} else {
			return this.getCommands(msgOrCommand, place, prefix)[0];
		}
	}

	/**
	 * Get a list of plugin commands from a message.
	 * This function will also get from a command's alias.
	 *
	 * Optimally, there should be only one command but will allow
	 * overlapping commands from different plugins.
	 *
	 * @param command Command ID
	 * @param place Place data
	 * @param prefix Prefix
	 *
	 * @returns List of commands with the same ID.
	 */
	getCommands(command: string, place?: Place, prefix?: string): BaseCommand[];

	/**
	 * Get a list of plugin commands from a message.
	 * This function will also get from a command's alias.
	 *
	 * Optimally, there should be only one command but will allow
	 * overlapping commands from different plugins.
	 *
	 * @param msg Framed message
	 * @param place Place data
	 *
	 * @returns List of commands with the same ID.
	 */
	getCommands(msg: BaseMessage, place?: Place): BaseCommand[];

	/**
	 * Get a list of plugin commands from a message.
	 * This function will also get from a command's alias.
	 *
	 * Optimally, there should be only one command but will allow
	 * overlapping commands from different plugins.
	 *
	 * @param msgOrCommand Framed Message or command
	 * @param place Place data
	 * @param prefix Prefix string
	 *
	 * @returns List of commands with the same ID.
	 */
	getCommands(
		msgOrCommand: BaseMessage | string,
		place?: Place,
		prefix?: string
	): BaseCommand[] {
		const commandList: BaseCommand[] = [];

		let commandString: string;

		if (msgOrCommand instanceof BaseMessage) {
			if (msgOrCommand.command != undefined) {
				prefix = msgOrCommand.prefix;
				commandString = msgOrCommand.command;
			} else {
				throw new Error(`Command parameter in Message was undefined`);
			}
		} else if (typeof msgOrCommand == "string") {
			commandString = msgOrCommand;
		} else {
			return commandList;
		}

		// Tries to the find the command in plugins
		for (const plugin of this.client.plugins.pluginsArray) {
			// Gets the command from the plugin, if it can
			// Subcommands are not allowed to declare new prefixes
			let command = plugin.commands.get(commandString);

			// If not found, check the aliases
			if (command == undefined) {
				// Tries to find the command from an alias
				command = plugin.aliases.get(commandString);
			}

			if (command != undefined) {
				let commandUsesPrefix = true;

				if (msgOrCommand instanceof DiscordInteraction) {
					commandList.push(command);
					continue;
				}

				if (prefix != undefined && place) {
					// Gets all valid prefixes for the place, and command
					const commandPrefixes = command.getPrefixes(place);
					commandPrefixes.push(...this.defaultPrefixes);

					if (
						msgOrCommand instanceof DiscordMessage &&
						msgOrCommand.discord.guild
					) {
						const rolePrefix =
							msgOrCommand.discord.guild.me?.roles.botRole?.toString();
						if (rolePrefix) commandPrefixes.push(rolePrefix);
					}

					// Gets the base command's prefixes or default prefixes, and see if they match.
					// If there was no prefix defined, ignore prefix checks.
					commandUsesPrefix = commandPrefixes.includes(prefix);
				}

				if (commandUsesPrefix) {
					commandList.push(command);
				}
			}
		}

		return commandList;
	}

	//#endregion

	/**
	 * Runs a command, based on the Message parameters
	 * @param msg Message object
	 */
	async run(msg: BaseMessage): Promise<Map<string, boolean>> {
		const startTime = process.hrtime();
		const map = new Map<string, boolean>();

		// If the author is a bot, we ignore their command.
		/*
		 * This is to patch any security exploits, such as using the Raw.ts command
		 * to print out a plain message that contains a comamnd. Then, the command will
		 * run with elevated permissions, as the bot likely has higher permissions than the user.
		 */
		if (msg.discord?.author.bot) {
			Logger.warn(
				`${msg.discord.author.tag} attempted to run a command, but was a bot!`
			);
			return map;
		}

		// If for some reason I see this, I'm going to
		if (msg.discordInteraction?.user.bot) {
			Logger.warn(
				oneLine`${msg.discordInteraction.user.tag} (from discordInteraction)
				attempted to run a command, but was a bot!`
			);
			return map;
		}

		try {
			if (msg.prefix != undefined && msg.command != undefined) {
				// Logger.silly(`Checking for commands for "${msg.content}"`);

				try {
					if (
						!(msg instanceof DiscordInteraction) ||
						msg instanceof DiscordCommandInteraction
					) {
						await this.scanAndRunCommands(msg, map, startTime);
					} else {
						await this.scanAndRunDiscordInteractions(
							msg,
							map,
							startTime
						);
					}
				} catch (error) {
					await this.handleFriendlyError(msg, error);
				}
			}
		} catch (error) {
			Logger.error((error as Error).stack);
		}

		if (Logger.isSillyEnabled() && map.size > 0) {
			Logger.silly(
				`${Utils.hrTimeElapsed(
					startTime
				)}s - Finished finding and sending commands`
			);
		}
		return map;
	}

	/**
	 * If a non-friendly error was passed, it'll be outputted to console
	 *
	 * @param msg
	 * @param error
	 */
	async handleFriendlyError(
		msg: BaseMessage,
		error: unknown,
		catchSendMessage = false
	): Promise<void> {
		if (error instanceof FriendlyError) {
			Logger.warn(oneLine`The below warning is likely
			safe to ignore, unless needed for debug purposes.`);
			Logger.warn((error as Error).stack);

			try {
				await this.sendErrorMessage(msg, error);
			} catch (error) {
				if (catchSendMessage) {
					Logger.error((error as Error).stack);
				} else {
					throw error;
				}
			}
		} else {
			Logger.error((error as Error).stack);
		}
	}

	async scanAndRunCommands(
		msg: BaseMessage,
		map: Map<string, boolean>,
		startTime?: [number, number]
	): Promise<Map<string, boolean>> {
		// Attempts to get the command data from a message, including comparing prefixes
		const data = await this.getFoundCommandData(msg, await msg.getPlace());

		for await (const element of data) {
			// Attempts to get the subcommand if it exists.
			// If not, use the base command.
			let command = element.command;
			if (element.subcommands.length > 0) {
				command = element.subcommands[element.subcommands.length - 1];
			}

			const permCheck = await this.checkForPermissions(msg, command, map);
			if (!permCheck) {
				continue;
			}

			const cooldownCheck = await this.processCooldownCheck(
				msg,
				command,
				map
			);
			if (!cooldownCheck) {
				continue;
			}

			const displayTime = startTime
				? `${Utils.hrTimeElapsed(startTime)}s - `
				: "";

			if (msg instanceof DiscordMessage) {
				Logger.verbose(
					oneLine`${displayTime}Running command "${msg.content}" from
					user ${msg.discord.author.tag} (${msg.discord.author.id})`
				);
			} else if (
				msg instanceof DiscordInteraction &&
				msg.discordInteraction.interaction.isCommand()
			) {
				const interaction = msg.discordInteraction.interaction;
				const options = Utils.util.inspect(interaction.options);

				Logger.verbose(
					oneLine`${displayTime}Running
					/${interaction.commandName}
					from user ${interaction.user.tag}
					(${msg.discordInteraction.user.id})`
				);
				if (options) {
					Logger.verbose(options);
				}
			} else {
				Logger.verbose(`Running command "${msg.content}"`);
			}

			let success = false;
			if (
				command instanceof BaseDiscordInteraction &&
				msg.discordInteraction
			) {
				success = await command.run(
					msg,
					msg.discordInteraction.interaction
				);
			} else {
				success = await command.run(msg);
			}

			if (success && command.cooldown?.setAutomatically != false) {
				if (!msg.userId) {
					Logger.error("msg.userId is empty");
				} else {
					await this.setCooldown(msg.userId, command);
				}
			}

			map.set(command.fullId, success);
		}

		return map;
	}

	async scanAndRunDiscordInteractions(
		msg: DiscordInteraction,
		map: Map<string, boolean>,
		startTime?: [number, number]
	): Promise<Map<string, boolean>> {
		const interactions = this.client.plugins.discordInteractionsArray;

		for await (const command of interactions) {
			const passed = await this.checkForPermissions(msg, command, map);
			if (!passed) {
				continue;
			}

			if (msg.command && command.id != msg.command.toLocaleLowerCase()) {
				continue;
			}

			const interaction = msg.discordInteraction.interaction;
			const matchesType = this.discordInteractionMatchesBaseType(
				interaction,
				command
			);

			if (!matchesType) {
				continue;
			}

			if (Logger.isSillyEnabled()) {
				let options = "";
				if (
					interaction.isApplicationCommand() ||
					interaction.isContextMenu() ||
					interaction.isCommand()
				) {
					options = Utils.util.inspect(interaction.options);
				}

				if (options) {
					const displayTime = startTime
						? `${Utils.hrTimeElapsed(startTime)}s - `
						: "";
					Logger.silly(oneLine`${displayTime}Running interaction
						${interaction.id} from user ${interaction.user.tag}
						(${interaction.user.id})`);
					Logger.silly(options);
				}
			}

			const success = await command.run(msg, interaction);
			map.set(command.fullId, success);
		}

		return map;
	}

	protected discordInteractionMatchesBaseType(
		interaction: Discord.Interaction,
		command: BaseCommand
	): boolean {
		return (
			(interaction.isAutocomplete() &&
				command instanceof BaseDiscordAutocompleteInteraction) ||
			(interaction.isButton() &&
				command instanceof BaseDiscordButtonInteraction) ||
			(interaction.isCommand() &&
				command instanceof BaseDiscordInteraction) ||
			(interaction.isContextMenu() &&
				command instanceof BaseDiscordContextMenuInteraction) ||
			(interaction.isMessageComponent() &&
				command instanceof BaseDiscordMessageComponentInteraction) ||
			(interaction.isSelectMenu() &&
				command instanceof BaseDiscordSelectMenuInteraction)
		);
	}

	/**
	 * Checks for permission, and sends an error message
	 *
	 * @param msg
	 * @param command
	 * @param map Optional results map
	 *
	 * @returns true if passed
	 */
	async checkForPermissions(
		msg: BaseMessage,
		command: BaseCommand,
		map?: Map<string, boolean>
	): Promise<boolean> {
		// Checks automatically for user permissions
		if (command.userPermissions?.checkAutomatically != false) {
			const data = command.checkUserPermissions(msg);
			if (!data.success) {
				const sent = await command.sendUserPermissionErrorMessage(
					msg,
					command.userPermissions,
					data
				);
				if (!sent) {
					Logger.error(oneLine`"${command.id}" tried to send
					a user permission error message, but something went wrong!`);
				}
				map?.set(command.fullId, false);
				return false;
			}
		}

		// Checks automatically for bot permissions
		if (command.botPermissions?.checkAutomatically != false) {
			const data = await command.checkBotPermissions(msg);
			if (!data.success) {
				let sent = false;
				let sentError: Error | undefined;
				try {
					sent = await command.sendBotPermissionErrorMessage(
						msg,
						command.botPermissions,
						data
					);
				} catch (error) {
					sentError = error as Error;
				}

				if (sentError) {
					Logger.error(sentError);
				} else if (!sent) {
					Logger.error(oneLine`"${command.id}" tried to send
					a user permission error message, but something went wrong!`);
				}

				map?.set(command.fullId, false);
				return false;
			}
		}

		return true;
	}

	async processCooldownCheck(
		msg: BaseMessage,
		command: BaseCommand,
		map?: Map<string, boolean>
	): Promise<boolean> {
		// Checks automatically for user permissions
		if (command.cooldown?.checkAutomatically != false) {
			const userId = msg.userId;

			// Fallback, if for some reason there is no userId
			if (userId == undefined) return true;

			const cooldownData = await command.getCooldown(userId);
			if (cooldownData) {
				const currentDate = new Date();
				if (typeof cooldownData.endDate == "string") {
					cooldownData.endDate = new Date(cooldownData.endDate);
				}
				const cooldownActive =
					cooldownData.endDate.getTime() > currentDate.getTime();

				if (cooldownActive) {
					let sent = false;
					let sentError: Error | undefined;
					try {
						sent = await command.sendCooldownErrorMessage(
							msg,
							cooldownData.endDate,
							currentDate
						);
					} catch (error) {
						sentError = error as Error;
					}

					if (sentError) {
						Logger.error(sentError);
					} else if (!sent) {
						Logger.error(`"${command.id}" tried to send
						a cooldown error message, but something went wrong!`);
					}
				}

				map?.set(command.fullId, !cooldownActive);
				return !cooldownActive;
			}
		}

		return true;
	}

	async setCooldown(userId: string, command: BaseCommand): Promise<void> {
		if (!command.cooldown) return;

		const client = command.client;
		const date = new Date();
		date.setSeconds(date.getSeconds() + command.cooldown?.time);

		return client.provider.cooldowns.set({
			userId: userId,
			commandId: command.fullId,
			cooldownDate: date,
		});
	}

	/**
	 * Sends a message showing help for a command.
	 *
	 * @param msg Framed Message containing command that needs to be shown help for
	 *
	 * @returns boolean value `true` if help is shown.
	 */
	async sendHelpForCommand(msg: BaseMessage): Promise<boolean> {
		try {
			const helpCommand = msg.client.commands.getCommand("help");

			if (!helpCommand) {
				Logger.warn("No help command found");
				return false;
			}

			const place = await msg.getPlace();
			const helpPrefix = helpCommand.getDefaultPrefix(place);

			const content = oneLineInlineLists`${
				helpPrefix ??
				msg.client.commands.defaultPrefixes[0] ??
				msg.client.defaultPrefix
			}help ${msg.command} ${msg.args ?? ""}`.trim();

			let newMsg: DiscordMessage | TwitchMessage;
			let guild: Discord.Guild | undefined;
			if (msg instanceof DiscordMessage) {
				newMsg = new DiscordMessage({
					client: msg.client,
					content: content,
					discord: {
						client: msg.discord.client,
						channel: msg.discord.channel,
						author: msg.discord.author,
						guild: msg.discord.guild,
					},
				});

				guild = msg.discord.guild ?? undefined;
			} else if (msg instanceof TwitchMessage) {
				newMsg = new TwitchMessage({
					client: msg.client,
					content: content,
					twitch: {
						chat: msg.twitch.chat,
						channel: msg.twitch.channel,
						user: msg.twitch.user,
					},
				});
			} else {
				throw new Error("Unknown message class");
			}

			await newMsg.getMessageElements(place, guild);
			const success = await helpCommand.run(newMsg);
			if (success) {
				return true;
			} else {
				throw new Error("Help command execution didn't succeed");
			}
		} catch (error) {
			Logger.error((error as Error).stack);
			return false;
		}
	}

	/**
	 * Sends error message
	 *
	 * @param friendlyError
	 * @param commandId Command ID for EmbedHelper.getTemplate
	 */
	async sendErrorMessage(
		msg: BaseMessage,
		friendlyError: FriendlyError,
		commandId?: string
	): Promise<void> {
		let embed: Discord.MessageEmbed | undefined;
		let options:
			| string
			| Discord.MessagePayload
			| Discord.MessageOptions
			| Discord.InteractionReplyOptions
			| undefined;

		if (msg.discord) {
			embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, commandId)
			)
				.setTitle(friendlyError.friendlyName)
				.setDescription(friendlyError.message);
			options = { embeds: [embed] };
		}

		// If it's an interaction, make it ephemeral
		if (msg instanceof DiscordInteraction && embed) {
			const useEmbedForFriendlyErrors =
				process.env.FRAMED_USE_EMBED_FOR_FRIENDLY_ERRORS;
			if (useEmbedForFriendlyErrors?.toLocaleLowerCase() != "true") {
				options = { embeds: [embed], ephemeral: true };
			} else {
				options = {
					content: `**${friendlyError.friendlyName}**\n${friendlyError.message}`,
					ephemeral: true,
				};
			}
		}

		if (options) {
			await msg.send(options);
		} else {
			await msg.send(
				`${friendlyError.friendlyName}: ${friendlyError.message}`
			);
		}
	}

	/**
	 * Sends an error message, with what permissions the user needs to work with.
	 *
	 * @param msg
	 * @param command
	 * @param permissions
	 * @param deniedData
	 * @returns
	 */
	async sendUserPermissionErrorMessage(
		msg: BaseMessage,
		command: BaseCommand,
		permissions = command.userPermissions,
		deniedData = command.checkUserPermissions(msg, permissions)
	): Promise<boolean> {
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
				discord,
				await EmbedHelper.getCheckOutFooter(msg, command.id)
			).setTitle("Permission Denied");

			let useEmbed = true;
			if (deniedData.reasons.includes("discordMissingPermissions")) {
				if (permissions?.discord?.permissions) {
					// Gets user's permissions and missing permissions
					const userPerms = new Discord.Permissions(
						msg.discord.member?.permissions
					);
					const missingPerms = userPerms.missing(
						permissions.discord.permissions
					);
					useEmbed = !missingPerms.includes("EMBED_LINKS");
				}
			}

			const notAllowed = `${discord.author}, you aren't allowed to do that!`;
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
							const userPerms = new Discord.Permissions(
								discord.member?.permissions
							);
							missingPerms = userPerms.missing(
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
										Logger.error(oneLine`BaseCommand.ts:
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

			if (msg instanceof DiscordMessage) {
				if (missingPerms.includes("SEND_MESSAGES")) {
					try {
						if (
							msg.prefix &&
							msg.client.commands.defaultPrefixes.includes(
								msg.prefix
							)
						) {
							const dmChannel =
								await msg.discord.author.createDM();
							await dmChannel.send({ embeds: [embed] });
							await dmChannel.send(oneLine`The bot couldn't send a message
							in <#${msg.discord.channel.id}>, due to permissions. Please
							report this to server staff, or if you are server staff,
							please check the permissions in the channel.`);
						} else {
							throw new Error(
								"Missing SEND_MESSAGES permission, cannot send error"
							);
						}
					} catch (error) {
						Logger.error((error as Error).stack);
					}
				} else if (missingPerms.includes("EMBED_LINKS")) {
					await msg.send(
						`**${embed.title}**\n${oneLine`Unfortunately, the
							\`EMBED_LINKS\` permission is disabled, so I can't send any details.`}`
					);
				} else {
					await msg.send({ embeds: [embed] });
				}
			} else {
				await msg.send({ embeds: [embed], ephemeral: true });
			}

			return true;
		} else {
			await msg.send(
				"Something went wrong when checking user permissions!"
			);
			return false;
		}
	}

	/**
	 * Sends an error message, with what permissions the bot needs to work with.
	 *
	 * @param msg
	 * @param command
	 * @param botPermissions
	 * @param deniedData
	 * @returns
	 */
	async sendBotPermissionErrorMessage(
		msg: BaseMessage,
		command: BaseCommand,
		botPermissions = command.botPermissions,
		deniedData: BotPermissionAllowedData | BotPermissionDeniedData
	): Promise<boolean> {
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
				description += oneLine`User permissions were
					specified, but there was no specific Discord
					permission data entered. By default, this will deny
					permissions to anyone but bot owners.`;
			} else {
				// Finds all the missing permissions
				missingPerms = await command.getMissingDiscordBotPermissions(
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
				msg: DiscordMessage | DiscordInteraction
			): Promise<
				| Discord.MessagePayload
				| Discord.MessageOptions
				| Discord.InteractionReplyOptions
			> {
				const embed = EmbedHelper.getTemplate(
					msg.discord,
					await EmbedHelper.getCheckOutFooter(msg, command.id)
				)
					.setTitle(title)
					.setDescription(description);

				if (permissionString) {
					embed.addField("Discord Permissions", permissionString);
				}

				if (msg instanceof DiscordMessage) {
					return { embeds: [embed] };
				} else {
					return { ephemeral: true, embeds: [embed] };
				}
			}

			const title = "Bot Permissions Error";
			if (
				msg instanceof DiscordMessage &&
				missingPerms.includes("SEND_MESSAGES")
			) {
				throw new Error(
					"Missing SEND_MESSAGES permission, cannot send error"
				);
				// const dmChannel = await msg.discord.author.createDM();
				// await dmChannel.send({ embeds: [embed] });
				// await dmChannel.send(oneLine`The bot couldn't send a message
				// in <#${msg.discord.channel.id}>, due to permissions. Please
				// report this to server staff, or if you are server staff,
				// please check the permissions in the channel.`);
			} else if (
				msg instanceof DiscordMessage &&
				missingPerms.includes("EMBED_LINKS")
			) {
				await msg.send(
					`**${title}**\n${description} ${permissionString}`
				);
			} else {
				const options = await createMessageOptions(msg);
				await msg.send(options);
			}

			return true;
		} else {
			await msg.send(
				"Something went wrong when checking bot permissions!"
			);
			return false;
		}
	}
}
