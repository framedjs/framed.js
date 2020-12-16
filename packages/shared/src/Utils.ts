import fs from "fs";
import path from "path";
import util from "util";

/**
 * Some utility functions.
 */
export class Utils {
	/**
	 * Since this import can hide Node's default util plugin, it is re-exported here for convenience.
	 */
	public static readonly Node = util;

	/**
	 * Returns a list of files, found inside folder. Also searches inside folder of folders.
	 * @param pathString
	 * @param filter
	 */
	public static findFileNested(
		pathString: string,
		filter: (file: string) => boolean
	): string[] {
		let results: string[] = [];

		if (!fs.existsSync(pathString)) {
			throw new Error(`Path "${pathString}" doesn't exist!`);
		}

		const files = fs.readdirSync(pathString);
		for (const file of files) {
			const filename = path.join(pathString, file);
			const stat = fs.statSync(filename);

			if (stat.isDirectory()) {
				// Recursive, goes into folder
				results = results.concat(this.findFileNested(filename, filter));
			} else if (files.findIndex(filter) >= 0) {
				// If file matches the filter, push the file
				results.push(filename);
			}
		}

		return results;
	}

	/**
	 * Generates a random number, as an integer
	 * @param min - Minimum number
	 * @param max - Maxiumum number (inclusive)
	 */
	public static randomNumber(min: number, max: number): number {
		return Math.floor(Math.random() * (max + 1 - min) + min);
	}

	/**
	 * Returns a variable that could be null into undefined.
	 *
	 * To make the value no longer the type "unknown", cast a value
	 * to your wanted value.
	 *
	 * ```ts
	 * let newString = "This is a string";
	 * let nonNullVariable = turnUndefinedIfNull(newString) as string;
	 * ```
	 */
	public static turnUndefinedIfNull(variable: unknown): unknown | undefined {
		if (variable == null) {
			variable = undefined;
		}
		return variable;
	}

	/**
	 * Sleeps for a defined period of time.
	 *
	 * @param ms Milliseconds
	 */
	public static sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
