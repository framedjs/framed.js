import { FriendlyError } from "./FriendlyError";

export class NotFoundError extends FriendlyError {
	friendlyName = "Not Found";

	constructor(options: {
		/**
		 * Inputted data by the user
		 */
		input: string;

		/**
		 * Name of the item that wasn't found
		 */
		name: string;

		/**
		 * Lowercase version of the name. If the name must be
		 * capitalized, pass in the name with capitals here.
		 */
		lowercaseName?: string;

		/**
		 * The message after the main not found message. This can be debug info.
		 */
		extraMessage?: string;
	}) {
		super();

		if (!options.name) {
			options.name = "Item";
		}
		this.friendlyName = `${options.name} ${this.friendlyName}`;
		this.message = `The ${
			options.lowercaseName ?? options.name.toLowerCase()
		} \`${options.input}\` could not be found.`;
		if (options.extraMessage) {
			this.message += ` ${options.extraMessage}`;
		}

		this.name = NotFoundError.name;
	}
}
