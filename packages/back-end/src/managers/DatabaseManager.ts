import * as TypeORM from "typeorm";
import path from "path";
import { logger } from "shared";

export class DatabaseManager {
	static readonly defaultDbPath = path.join(__dirname, "..", "..", "data", "FramedDB.sqlite");
	static readonly defaultEntitiesPath = path.join(__dirname, "database", "entities");
	static readonly defaultMigrationsPath = path.join(__dirname, "database", "migrations");
	static readonly defaultSubscribersPath = path.join(__dirname, "database", "subscribers");

	public options: TypeORM.ConnectionOptions;
	
	constructor(options: TypeORM.ConnectionOptions) {
		this.options = options;
	}

	async start(): Promise<void> {
		await TypeORM.createConnection(this.options);
	}
}