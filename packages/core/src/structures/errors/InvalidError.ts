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
		 * Keep the upper and lower casing from the name inputted,
		 * for when it goes into the message variable.
		 * By default, this is set to false.
		 */
		keepCasingInMessage?: boolean;

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
		this.message = `The ${options.name} \`${options.input}\` is invalid.`;
		if (options.extraMessage) {
			this.message += ` ${options.extraMessage}`;
		}

		this.name = InvalidError.name;
	}
}
