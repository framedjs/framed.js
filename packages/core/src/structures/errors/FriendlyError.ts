export class FriendlyError extends Error {
	friendlyName = "Something Went Wrong";

	constructor(message?: string) {
		super(message ? message : `An unknown error occured.`);
		this.name = FriendlyError.name;
	}
}
