/**
 * Used for detailed argument data
 */
export interface Argument {
	/**
	 * The argument string
	 */
	argument: string;

	/**
	 * Untrimmed argument string
	 */
	untrimmedArgument: string;

	/**
	 * Was this argument wrapped in quoted?
	 */
	wrappedInQuotes: boolean;

	/**
	 * If this argument was a part of a quoted section, but quotes weren't
	 * closed properly at the end, this will be true.
	 */
	nonClosedQuoteSection: boolean;
}
