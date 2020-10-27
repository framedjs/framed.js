import fs from "fs";
import path from "path";

export class Utils {
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
			throw new Error();
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
}
