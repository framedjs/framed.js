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

	public options: TypeORM.ConnectionOptions;

	constructor(options: TypeORM.ConnectionOptions) {
		this.options = options;
	}

	async start(): Promise<void> {
		await TypeORM.createConnection(this.options);

		const prefixRepo = TypeORM.getRepository(Prefix);
		let defaultPrefix = await prefixRepo.findOne({
			where: {
				id: "default",
			},
		});

		// Generates default prefix, if none existed before
		if (!defaultPrefix) {
			defaultPrefix = prefixRepo.create({
				id: "default",
				prefix: ".",
			});
			prefixRepo.save(defaultPrefix);
		}
	}
}
