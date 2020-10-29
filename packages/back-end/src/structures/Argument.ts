export class Argument {
	options: ArgumentOptions;
	constructor(options: ArgumentOptions) {
		this.options = options;
	}
	
}

export interface ArgumentOptions {
	name: string;
	type: ArgumentType;
}

export enum ArgumentType {
	Integer,
	Float,
	String,
	User,
	Quoted
}