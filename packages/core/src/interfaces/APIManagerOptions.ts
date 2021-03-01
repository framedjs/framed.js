export interface APIManagerOptions {
	/**
	 * The port the API will run on.
	 *
	 * @defaultValue If not set, this will default to
	 * process.env.API_PORT if that is anything, or 42069.
	 */
	port?: number;
}
