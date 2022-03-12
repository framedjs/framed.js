import fs from "fs";
import path from "path";
import util from "util";
import RequireAll from "require-all";
import type { RequireAllOptions } from "./interfaces/RequireAllOptions";

interface RequireAllScriptData {
	[key: string]: ScriptElement;
}

interface ScriptElement {
	[key2: number]: {
		default: unknown;
	};
}

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

	//#region Rough benchmarking

	/**
	 * Gets the time elapsed between high-resolution times with `process.hrtime()`
	 * @param startTime The start high-resolution time
	 */
	static hrTimeElapsed(
		startTime: [number, number],
		sendSeconds = false
	): string {
		// Gets the difference between the start time, and now
		const diffTime = process.hrtime(startTime);
		return this.formatHrTime(diffTime, sendSeconds);
	}

	/**
	 * The diffTime
	 */
	static formatHrTime(
		diffTime: [number, number],
		sendSeconds = false
	): string {
		const secondStr = sendSeconds ? "s" : "";

		// Gets the seconds value
		const s = diffTime[0];

		// Gets the ms value
		/**
		 * First, the process.hrtime value is divided by 1.0*10^6 (1000000)
		 * and is used to get the proper millisecond value.
		 *
		 * We can't use this number value immediately, as there's decimals.
		 * To change that, we round the value.
		 *
		 * Now, we need it to be a string for padding zeros.
		 *
		 * Finally, we add extra zeros at the start of our new number string.
		 * It's set to have 3 zeros at most.
		 */
		const ms = Math.round(diffTime[1] / 1e6)
			.toString()
			.padStart(3, "0");

		return `${s}.${ms}${secondStr}`;
	}

	//#endregion

	//#region Script importing

	/**
	 * Imports scripts from a path, gets all the default exports, then puts it into an array
	 * @param options RequireAll Options
	 */
	static importScripts(options: RequireAllOptions): unknown[] {
		const scriptsList: unknown[] = [];

		// Sanity check
		if (!fs.existsSync(options.dirname)) return scriptsList;

		const requiredScripts: RequireAllScriptData = RequireAll(options);
		// Logger.silly(`requiredScripts: ${util.inspect(requiredScripts)}`);

		const requiredScriptsValues = Object.values(requiredScripts);
		// Logger.silly(
		// 	`requiredScriptsValues: ${util.inspect(requiredScriptsValues)}`
		// );

		for (const key in requiredScriptsValues) {
			const script = requiredScriptsValues[key];
			// Logger.silly(`Key1: ${key} | ${util.inspect(script)}`);

			// Recursively gets scripts from the object, for nested folders
			const values = Object.values(script);
			scriptsList.push(...this.recursiveGetScript(values));
		}

		// Logger.silly(`Scripts: ${util.inspect(scriptsList)}`);

		return scriptsList;
	}

	/**
	 * Recursively returns an array of imported scripts
	 *
	 * @param values
	 */
	private static recursiveGetScript(values: ScriptElement): unknown[] {
		const scripts: unknown[] = [];

		for (const key in values) {
			// Logger.silly(`Key2: ${key} | ${util.inspect(values)}`);

			let exports = values[key];

			// For some reason, TypeScript thinks this value can be a number
			if (typeof exports == "object") {
				if (typeof exports.default === "function") {
					// Logger.silly("Exported default is a function");
					exports = exports.default;
				} else {
					scripts.push(...this.recursiveGetScript(exports));
					continue;
				}
			}

			scripts.push(exports);
		}

		return scripts;
	}

	//#endregion
}
