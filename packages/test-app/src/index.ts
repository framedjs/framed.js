import { FramedClient, DatabaseManager, FramedLoginOptions } from "back-end";
import { logger, Utils } from "shared";
import fs from "fs";
import path from "path";

// https://www.stefanjudis.com/today-i-learned/measuring-execution-time-more-precisely-in-the-browser-and-node-js/
const startTime = process.hrtime();

logger.level = process.env.LOGGER_LEVEL ? process.env.LOGGER_LEVEL : "silly";
logger.info("Starting Test App");
logger.info(`This bot is running Framed v${FramedClient.version}.`);

// Gets the version of the app
let version: string | undefined;
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

// Initializes FramedClient
const framedClient = new FramedClient({
	defaultConnection: {
		type: "sqlite",
		database: "./data/FramedDB.sqlite",
		synchronize: true,
		dropSchema: false,
		logging: false,
		entities: [DatabaseManager.defaultEntitiesPath],
	},
	defaultPrefix: process.env.DEFAULT_PREFIX
		? process.env.DEFAULT_PREFIX
		: "/",
	appVersion: version,
});

// Creates login data
const loginData: FramedLoginOptions[] = [
	{
		type: "discord",
		discord: {
			token: process.env.DISCORD_TOKEN,
		},
	},
];

if (
	process.env.TWITCH_ACCESS_TOKEN &&
	process.env.TWITCH_CLIENT_ID &&
	process.env.TWITCH_CLIENT_SECRET &&
	process.env.TWITCH_REFRESH_TOKEN &&
	process.env.TWITCH_CHANNELS
) {
	// If all the environmental variable values exist, push Twitch as a possible login
	loginData.push({
		type: "twitch",
		twitch: {
			accessToken: process.env.TWITCH_ACCESS_TOKEN,
			clientId: process.env.TWITCH_CLIENT_ID,
			clientSecret: process.env.TWITCH_CLIENT_SECRET,
			refreshToken: process.env.TWITCH_REFRESH_TOKEN,
			channels: process.env.TWITCH_CHANNELS.split(","),
		},
	});
}

// Load plugins
framedClient.plugins.loadPluginsIn({
	dirname: path.join(__dirname, "plugins"),
	filter: /^(.+plugin)\.(js|ts)$/,
	excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)$/,
});

// Login
framedClient.login(loginData).then(async () => {
	logger.info(
		`Done (${Utils.hrTimeElapsed(startTime)}s)! Framed v${
			FramedClient.version
		} has been loaded.`
	);
});
