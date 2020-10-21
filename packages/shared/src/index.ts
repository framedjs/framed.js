import Colors from "colors";
import Discord from "discord.js";
import Winston from "winston";

export * from './user'; // test

// https://github.com/winstonjs/winston#logging-levels
export const logger = Winston.createLogger({
	level: "silly",
	levels: Winston.config.npm.levels,
	// format: Winston.format.simple(),
	format: Winston.format.combine(
		Winston.format.colorize(),
		Winston.format.timestamp({
			format: "HH:mm:ss",
		}),
		Winston.format.printf(
			info =>
				`${Colors.gray(`[${info.timestamp}]`)} ${info.level}: ${
					info.message
				}`
		)
	),
	transports: [new Winston.transports.Console()],
});
