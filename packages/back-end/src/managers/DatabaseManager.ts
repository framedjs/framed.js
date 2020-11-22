import * as TypeORM from "typeorm";
import path from "path";
import { logger } from "shared";
import Prefix from "./database/entities/Prefix";

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
				logger.error(`Error happened while installing!\n${error.stack}`);
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
}
