import colors from "colors";
import winston from "winston";

const format = winston.format;

/**
 * Customized default levels (npm) and their respective colors.
 */
export const defaultLevels = {
	levels: {
		error: 0,
		warn: 1,
		info: 2,
		http: 3,
		verbose: 4,
		debug: 5,
		silly: 6,
	},
	colors: {
		error: "red",
		warn: "yellow",
		info: "green",
		http: "gray",
		verbose: "cyan",
		debug: "blue",
		silly: "magenta",
	},
};

/**
 * Default formatting used.
 */
export const defaultFormat = format.combine(
	format.colorize({
		colors: defaultLevels.colors,
	}),
	format.timestamp({
		format: "HH:mm:ss",
	}),
	format.printf(info => {
		const timestamp = colors.gray(`[${info.timestamp}]`);
		return `${timestamp} ${info.level}: ${info.message}`;
	})
);

/**
 * The default Logger.
 * @see https://github.com/winstonjs/winston
 */
export const Logger = winston.createLogger({
	level: "silly",
	levels: defaultLevels.levels,
	format: defaultFormat,
	transports: [new winston.transports.Console()],
});
