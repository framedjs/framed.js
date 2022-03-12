// More-or-less the same as index.d.ts for require-all, but I'm just too lazy
// to contribute to the DefinitelyTyped repo to export this interface, then wait
export interface RequireAllOptions {
	dirname: string;
	filter?:
		| ((name: string, path: string) => string | false | undefined)
		| RegExp;
	excludeDirs?: RegExp;
	map?: (name: string, path: string) => string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	resolve?: (module: any) => any;
	recursive?: true | false;
}
