export class ImportError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = ImportError.name;
	}
}
