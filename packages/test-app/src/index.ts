import { logger } from "shared";
import { FramedClient, DatabaseManager } from "back-end";
import path from "path";
import settings from "../settings.json";
import { version as appVersion } from "../package.json";

logger.level = "verbose";

logger.info("Starting Test App");

const framedClient = new FramedClient({
	defaultConnection: {
		type: "sqlite",
		database: "./data/FramedDB.sqlite",
		synchronize: true,
		dropSchema: false,
		logging: true,
		entities: [DatabaseManager.defaultEntitiesPath],
	},
	defaultPrefix: ".",
	appVersion: appVersion,
});

framedClient.pluginManager.loadPluginsIn({
	dirname: path.join(__dirname, "plugins"),
	filter: /^(.+plugin)\.(js|ts)$/,
	excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)$/,
});

framedClient.login(settings.token);
