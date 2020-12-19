import { logger } from "shared";
import { FramedClient, DatabaseManager } from "back-end";
import fs from "fs";
import path from "path";
let version: string | undefined;

logger.level = "silly";

logger.info("Starting Test App");

try {
	const packageFile = fs.readFileSync(
		path.resolve(__dirname, "../package.json"),
		"utf8"
	);
	const packageJson = JSON.parse(packageFile);
	version = packageJson.version;
} catch (error) {
	logger.error(error.stack);
}

const framedClient = new FramedClient({
	defaultConnection: {
		type: "sqlite",
		database: "./data/FramedDB.sqlite",
		synchronize: true,
		dropSchema: false,
		logging: true,
		entities: [DatabaseManager.defaultEntitiesPath],
	},
	defaultPrefix: "/",
	appVersion: version,
});

framedClient.pluginManager.loadPluginsIn({
	dirname: path.join(__dirname, "plugins"),
	filter: /^(.+plugin)\.(js|ts)$/,
	excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)$/,
});

framedClient.login(process.env.DISCORD_TOKEN);