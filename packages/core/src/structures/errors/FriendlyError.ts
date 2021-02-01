export class FriendlyError extends Error {
	constructor(
		message?: string,
		public friendlyName = "Something Went Wrong"
	) {
		super(message ? message : `An unknown error occured.`);
		this.name = FriendlyError.name;
	}
}
