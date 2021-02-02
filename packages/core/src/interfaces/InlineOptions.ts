export interface InlineOptions {
	/**
	 * If set to true, all other options will be assumed as true, unless set to false.
	 */
	enableAllUnlessSpecified?: boolean;

	aliases?: boolean;
	examples?: boolean;
	notes?: boolean;
	usage?: boolean;
	prefixes?: boolean;
	plugin?: boolean;
}
