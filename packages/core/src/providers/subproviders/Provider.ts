import { Base } from "../../structures/Base";
import { BaseProvider } from "../BaseProvider";

export abstract class Provider extends Base {
	baseProvider: BaseProvider;
	protected cache = new Map();

	constructor(baseProvider: BaseProvider) {
		super(baseProvider.client);
		this.baseProvider = baseProvider;
	}

	/**
	 * Get an array of the private placePrefixes Map
	 */
	get array(): [unknown, unknown][] {
		return Array.from(this.cache);
	}
}
