/**
 * Used for detailed argument data
 */
export interface Argument {
	/** The argument string */
	argument: string;

	/** Untrimmed argument string */
	untrimmedArgument: string;

	/** The starting quote character */
	startQuoteChar?: string;

	/** The ending quote character */
	endQuoteChar?: string;

	/** Was this argument wrapped in quoted? */
	wrappedInQuotes: boolean;

	/**
	 * If this argument was a part of a quoted section, but quotes weren't
	 * closed properly at the end, this will be true.
	 *
	 * This includes anything with a starting quote character.
	 */
	nonClosedQuoteSection: boolean;
}

export interface ArgumentWrappedInQuotes extends Argument {
	startQuoteChar: string;
	endQuoteChar: string;
	wrappedInQuotes: true;
	nonClosedQuoteSection: true;
}

export interface ArgumentNotWrappedInQuotes extends Argument {
	startQuoteChar: undefined;
	endQuoteChar: undefined;
	wrappedInQuotes: false;
	nonClosedQuoteSection: false;
}
