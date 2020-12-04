import * as TypeORM from "typeorm";
import path from "path";
import { logger, NodeUtil, Utils } from "shared";
import Prefix from "./database/entities/Prefix";
import Command from "./database/entities/Command";
import Response from "./database/entities/Response";
import Group from "./database/entities/Group";
import { SnowflakeUtil } from "discord.js";
import Emoji from "node-emoji";
import FramedClient from "../structures/FramedClient";
import { BasePlugin } from "../structures/BasePlugin";

export class DatabaseManager {
	public static readonly defaultDbPath = path.join(
		__dirname,
		"..",
		"..",
		"data",
		"FramedDB.sqlite"
	);
	public static readonly defaultEntitiesPath = path.join(
		__dirname,
		"database",
		"entities",
		"**",
		"*.{ts,js}"
	);
	public static readonly defaultMigrationsPath = path.join(
		__dirname,
		"database",
		"migrations",
		"**",
		"*.{ts,js}"
	);
	public static readonly defaultSubscribersPath = path.join(
		__dirname,
		"database",
		"subscribers",
		"**",
		"*.{ts,js}"
	);

	public static readonly errorNoConnection =
		"there is no connection to the database!";
	public static readonly errorNotFound = `I couldn't find a %s with the name "%s".`;

	public connection?: TypeORM.Connection;
	public options: TypeORM.ConnectionOptions;

	constructor(
		options: TypeORM.ConnectionOptions,
		public readonly framedClient: FramedClient
	) {
		this.options = options;
	}

	/**
	 * Connects to the database and installs
	 */
	async start(): Promise<void> {
		this.connection = await TypeORM.createConnection(this.options);
		const freshInstalled = await this.checkFreshInstall();

		// Generates default prefix, if none existed before
		if (freshInstalled) {
			try {
				await this.installDefaults();
			} catch (error) {
				logger.error(
					`Error happened while installing!\n${error.stack}`
				);
			}
		}

		await this.install();
	}

	//#region Install
	/**
	 * Checks whether or not Framed has been initialized before,
	 * by checking if the default prefix exists.
	 *
	 * @returns `true` if it is fresh
	 */
	async checkFreshInstall(): Promise<boolean> {
		const connection = this.connection;
		if (!connection)
			throw new ReferenceError(DatabaseManager.errorNoConnection);

		const prefixRepo = connection.getRepository(Prefix);
		const defaultPrefix = await prefixRepo.findOne({
			where: {
				id: this.framedClient.defaultPrefix,
			},
		});

		return defaultPrefix == undefined;
	}

	/**
	 * Starts installing default entries in the database.
	 */
	async installDefaults(): Promise<void> {
		await this.addDefaultPrefix();
	}

	/**
	 * Installs necessary data from scripts.
	 */
	async install(): Promise<void> {
		try {
			await this.addScriptGroups();
		} catch (error) {
			logger.error(
				`Error happened while trying to install from scripts:\n${error.stack}`
			);
		}
	}
	//#endregion

	//#region Prefixes
	/**
	 * Adds the default prefix
	 */
	async addDefaultPrefix() {
		const connection = this.connection;
		if (connection) {
			const prefixRepo = connection.getRepository(Prefix);
			const defaultPrefix = prefixRepo.create({
				id: "default",
				prefix: ".",
			});
			await prefixRepo.save(defaultPrefix);
		} else {
			throw new Error(DatabaseManager.errorNoConnection);
		}
	}

	/**
	 * Get the default prefix
	 */
	async getDefaultPrefix(): Promise<Prefix> {
		const connection = this.connection;
		if (connection) {
			const prefixRepo = TypeORM.getRepository(Prefix);
			return prefixRepo.findOneOrFail({
				id: "default",
			});
		} else {
			throw new Error(DatabaseManager.errorNoConnection);
		}
	}
	//#endregion

	//#region Commands
	/**
	 * Finds a command in a database
	 *
	 * @param commandId Command ID
	 * @param prefix Prefix string
	 *
	 * @returns Command object from database, or undefined
	 */
	async findCommand(
		commandId: string,
		prefix: string
	): Promise<Command | undefined> {
		const connection = this.connection;
		if (!connection) {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}

		const commandRepo = connection.getRepository(Command);
		const prefixRepo = connection.getRepository(Prefix);
		if (commandRepo && prefixRepo) {
			const findingPrefixes = prefixRepo.find({
				where: {
					prefix: prefix,
				},
				relations: ["commands"],
			});

			const findingCommand = commandRepo.findOne({
				where: {
					id: commandId,
				},
				relations: ["prefixes", "response", "group"],
			});

			const [foundPrefixes, foundCommand] = await Promise.all([
				findingPrefixes,
				findingCommand,
			]);

			if (foundCommand) {
				let matchingCommand: Command | undefined;

				// Attempts to match the prefix with the matching command ID
				foundPrefixes.forEach(prefix => {
					foundCommand.prefixes.forEach(cmdPrefix => {
						if (cmdPrefix.id == prefix.id) {
							logger.debug(
								`DatabaseManager.ts: returning command ${foundCommand.id}`
							);
							matchingCommand = foundCommand;
						}
					});
				});

				return matchingCommand;
			}
		}
		return undefined;
	}

	/**
	 * Deletes command from the database
	 * @param id Command ID
	 */
	async deleteCommand(id: string): Promise<void> {
		if (this.connection) {
			// Deletes command
			await this.connection
				.createQueryBuilder()
				.delete()
				.from(Command)
				.where("id = :id", {
					id: id,
				})
				.execute();
		} else {
			throw new Error(
				"No connection to database while trying to delete Response!"
			);
		}
	}
	//#endregion

	//#region Responses
	/**
	 * Deletes response from database
	 * @param id Response ID
	 */
	async deleteResponse(id: string): Promise<void> {
		if (this.connection) {
			// Deletes command
			await this.connection
				.createQueryBuilder()
				.delete()
				.from(Response)
				.where("id = :id", {
					id: id,
				})
				.execute();
		} else {
			throw new Error(
				"No connection to database while trying to delete Response!"
			);
		}
	}
	//#endregion

	//#region Groups
	/**
	 * Adds groups from scripts, such as plugins and commands.
	 */
	async addScriptGroups() {
		const connection = this.connection;
		if (connection) {
			const groupRepo = connection.getRepository(Group);

			for await (const plugin of this.framedClient.pluginManager
				.pluginsArray) {
				// If it doesn't exist, add it
				if (!(await groupRepo.findOne(plugin.group))) {
					await groupRepo.save(
						groupRepo.create({
							id: plugin.fullGroupId,
							emote: plugin.groupEmote,
							name: plugin.group,
						})
					);
				}

				// Scans for commands
				for await (const command of Array.from(
					plugin.commands.values()
				)) {
					// If it doesn't exist, add it
					if (!(await groupRepo.findOne(command.group))) {
						await groupRepo.save(
							groupRepo.create({
								id: plugin.fullGroupId,
								emote: command.groupEmote,
								name: command.group,
							})
						);
					}
				}
			}
		} else {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}
	}

	/**
	 * Adds a new group
	 *
	 * @param name Name of the group
	 */
	async addGroup(name: string, emote?: string): Promise<Group> {
		const connection = this.connection;
		if (connection) {
			const groupRepo = connection.getRepository(Group);

			return await groupRepo.save(
				groupRepo.create({
					id: SnowflakeUtil.generate(new Date()),
					name: name,
					emote: emote,
				})
			);
		} else {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}
	}

	/**
	 * Edits an existing group by name
	 *
	 * @param oldNameOrId Name or ID of the group
	 */
	async editGroup(
		oldNameOrId: string,
		newName: string,
		newEmote?: string
	): Promise<Group> {
		if (newName.length == 0) {
			throw new ReferenceError("newName has to contain something!");
		}

		const connection = this.connection;
		if (connection) {
			const groupRepo = connection.getRepository(Group);
			const group = await this.findGroup(oldNameOrId);

			if (group) {
				return await groupRepo.save(
					groupRepo.create({
						id: group.id,
						commands: group.commands,
						emote: newEmote,
						name: newName,
					})
				);
			} else {
				throw new ReferenceError(
					`Couldn't find group with name "${oldNameOrId}"`
				);
			}
		} else {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}
	}

	/**
	 * Deletes the group by name or IDF
	 * @param nameOrId Name or ID of the group
	 */
	async deleteGroup(nameOrId: string): Promise<void> {
		const connection = this.connection;
		if (connection) {
			const groupRepo = connection.getRepository(Group);
			const commandRepo = connection.getRepository(Command);
			const group = await this.findGroup(nameOrId);

			if (group) {
				if (group.commands) {
					for (const command of group.commands) {
						command.group = undefined;
					}

					await Promise.all(await commandRepo.save(group.commands));
				}

				// Deletes group
				// https://stackoverflow.com/questions/54246615/what-s-the-difference-between-remove-and-delete#54246681
				await groupRepo.remove(group);
			} else {
				throw new ReferenceError(
					NodeUtil.format(
						DatabaseManager.errorNotFound,
						"group",
						nameOrId
					)
				);
			}
		} else {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}
	}

	/**
	 * Finds a group by name or ID
	 * @param nameOrId Name or ID of the group
	 * @returns Group entity, or undefined if none found
	 */
	async findGroup(nameOrId: string): Promise<Group | undefined> {
		const connection = this.connection;
		if (connection) {
			const groupRepo = connection.getRepository(Group);
			let newGroup = await groupRepo.findOne({
				where: { name: nameOrId },
			});
			if (!newGroup) {
				newGroup = await groupRepo.findOne({
					where: { id: nameOrId },
				});
			}
			return newGroup;
		} else {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}
	}

	/**
	 * Sets a command's group
	 *
	 * @param commandName Command name
	 * @param nameOrId Name or ID of the group
	 */
	async setGroup(
		commandName: string,
		nameOrId: string,
		commandPrefix?: string
	): Promise<Group> {
		const connection = this.connection;
		if (connection) {
			const groupRepo = connection.getRepository(Group);
			const commandRepo = connection.getRepository(Command);
			const group = await this.findGroup(nameOrId);
			const command = await this.findCommand(
				commandName,
				commandPrefix
					? commandPrefix
					: (await this.getDefaultPrefix()).prefix
			);

			if (group) {
				if (command) {
					const commands: Command[] = [];
					if (group.commands) {
						commands.push(...group.commands);
					}
					group.commands = [...commands, command];
					command.group = group;

					// There probably is something more faster and effiecient
					await commandRepo.save(command);
					return await groupRepo.save(group);
				} else {
					throw new ReferenceError(
						`Couldn't find command with name "${commandName}"`
					);
				}
			} else {
				throw new ReferenceError(
					`Couldn't find group with name "${nameOrId}"`
				);
			}
		} else {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}
	}
	//#endregion
}
