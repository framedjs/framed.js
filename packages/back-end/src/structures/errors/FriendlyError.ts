export class FriendlyError extends Error {
	constructor(description: string) {
		super(description);
		this.name = FriendlyError.name;
	}
}