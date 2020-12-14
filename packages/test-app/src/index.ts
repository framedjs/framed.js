import { logger } from "shared";
import { FramedClient } from "back-end";
import path from "path";
import settings from "../settings.json";
import { version as appVersion } from "../package.json";

logger.info("Starting Test App");

const framedClient = new FramedClient({
	defaultPrefix: ".",
	appVersion: appVersion,
});

framedClient.pluginManager.loadPluginsIn({
	dirname: path.join(__dirname, "plugins"),
	filter: /^(.+plugin)\.(js|ts)$/,
	excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)\.(js|ts)$/,
});

framedClient.login(settings.token);