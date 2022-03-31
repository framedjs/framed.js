import { FriendlyError } from "./FriendlyError";

export class InvalidError extends FriendlyError {
	friendlyName = "Invalid";

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
			options.name = "Input";
		}
		this.friendlyName = `${options.name} ${this.friendlyName}`;
		this.message = `The ${
			options.lowercaseName ?? options.name.toLowerCase()
		} \`${options.input}\` is invalid.`;
		if (options.extraMessage) {
			this.message += ` ${options.extraMessage}`;
		}

		this.name = InvalidError.name;
	}
}
