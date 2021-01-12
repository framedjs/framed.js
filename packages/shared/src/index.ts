import fs from "fs";
import path from "path";
import util from "util";

export class Utils {
	/**
	 * Since this import can hide Node's default util, it is re-exported here for convenience.
	 */
	static readonly util = util;

	/**
	 * Returns a list of files, found inside folder. Also searches inside folder of folders.
	 *
	 * @param pathString
	 * @param filter
	 */
	static findFileNested(
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
	 *
	 * @param min Minimum number
	 * @param max Maxiumum number (inclusive)
	 */
	static randomNumber(min: number, max: number): number {
		if (max < min) {
			throw new Error(
				`Max number (${max}) cannot be smaller than min number (${min})`
			);
		}
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
	static turnUndefinedIfNull(variable: unknown): unknown | undefined {
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
	static sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Gets the time elapsed between high-resolution times with `process.hrtime()`
	 * @param startTime The start high-resolution time
	 */
	static hrTimeElapsed(startTime: [number, number]): string {
		// Gets the difference between the start time, and now
		const diffTime = process.hrtime(startTime);

		// Fixed decimal places (ex. if set to 3, decimals will be 0.000)
		const fixedDecimals = 3;

		// diffTime[1] is the decimal number as a whole number, so
		// we need to convert that. This will remove some trailing numbers.
		const endDecimalString = String(diffTime[1]).slice(
			0,
			fixedDecimals + 1
		);

		// Negative exponent (for example, 10 ^ -3)
		const negativeExponent = Math.pow(10, -Number(fixedDecimals + 1));

		// Larger number (that should be a decimal) * negative exponent
		// will turn it into a decimal
		const endDecimalNumber = Number(
			Number(endDecimalString) * negativeExponent
		).toFixed(fixedDecimals);

		// Startup time
		return (diffTime[0] + Number(endDecimalNumber)).toFixed(fixedDecimals);
	}
}
