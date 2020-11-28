import * as TypeORM from "typeorm";
import path from "path";
import { logger } from "shared";
import Prefix from "./database/entities/Prefix";
import Command from "./database/entities/Command";
import Response from "./database/entities/Response";

export class DatabaseManager {
	static readonly defaultDbPath = path.join(
		__dirname,
		"..",
		"..",
		"data",
		"FramedDB.sqlite"
	);
	static readonly defaultEntitiesPath = path.join(
		__dirname,
		"database",
		"entities",
		"**",
		"*.{ts,js}"
	);
	static readonly defaultMigrationsPath = path.join(
		__dirname,
		"database",
		"migrations",
		"**",
		"*.{ts,js}"
	);
	static readonly defaultSubscribersPath = path.join(
		__dirname,
		"database",
		"subscribers",
		"**",
		"*.{ts,js}"
	);

	public connection?: TypeORM.Connection;
	public options: TypeORM.ConnectionOptions;

	constructor(options: TypeORM.ConnectionOptions) {
		this.options = options;
	}

	/**
	 *
	 */
	async start(): Promise<void> {
		this.connection = await TypeORM.createConnection(this.options);
		const installed = await this.checkInstall();

		// Generates default prefix, if none existed before
		if (!installed) {
			try {
				await this.install();
			} catch (error) {
				logger.error(
					`Error happened while installing!\n${error.stack}`
				);
			}
		}
	}

	/**
	 * Checks whether or not Framed has been initialized before,
	 * by checking if the default prefix exists
	 * @returns Boolean value if it's been installed before?
	 */
	async checkInstall(): Promise<boolean> {
		const prefixRepo = TypeORM.getRepository(Prefix);
		const defaultPrefix = await prefixRepo.findOne({
			where: {
				id: "default",
			},
		});

		return defaultPrefix != undefined;
	}

	async install(): Promise<boolean> {
		const prefixRepo = TypeORM.getRepository(Prefix);
		const defaultPrefix = prefixRepo.create({
			id: "default",
			prefix: ".",
		});
		await prefixRepo.save(defaultPrefix);
		return true;
	}

	/**
	 * Finds a command in a database
	 * 
	 * @param commandId Command ID
	 * @param prefix Prefix string
	 * 
	 * @returns Command object from database, or undefined
	 */
	async findCommandInDatabase(
		commandId: string,
		prefix: string
	): Promise<Command | undefined> {
		const commandRepo = this.connection?.getRepository(Command);
		const prefixRepo = this.connection?.getRepository(Prefix);
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
				relations: ["prefixes", "response"],
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
							logger.debug(`DatabaseManager.ts: returning command ${foundCommand.id}`);
							matchingCommand = foundCommand;
						}
					})
				});

				return matchingCommand;
			}
		}
		return undefined;
	}

	/**
	 * Deletes response from database
	 * @param id Response ID
	 */
	async deleteResponseFromDB(id: number): Promise<void> {
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

	/**
	 * Deletes command from the database
	 * @param id Command ID
	 */
	async deleteCommandFromDB(id: string): Promise<void> {
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
}
