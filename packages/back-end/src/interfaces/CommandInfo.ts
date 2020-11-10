export interface CommandInfo {
	id: string;
	aliases?: string[];
	defaultPrefix?: string;
	name: string;
	about?: string;
	description?: string;
	usage?: string;
	// args?: Argument[];
}
