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
			options.name = "Item";
		}
		this.friendlyName = `${options.name} ${this.friendlyName}`;
		this.message = `The ${
			options.keepCasingInMessage
				? options.name
				: options.name.toLocaleLowerCase()
		} \`${options.input}\` could not be found.`;
		if (options.extraMessage) {
			this.message += ` ${options.extraMessage}`;
		}

		this.name = NotFoundError.name;
	}
}
