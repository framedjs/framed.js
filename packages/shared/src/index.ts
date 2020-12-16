import Colors from "colors";
import Winston from "winston";

export { Utils } from "./Utils";

// https://github.com/winstonjs/winston#logging-levels
/**
 * Default logger
 */
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