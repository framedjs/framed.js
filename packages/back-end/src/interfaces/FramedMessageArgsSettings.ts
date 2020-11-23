export interface FramedMessageArgsSettings {
	/**
	 * If true, this puts the quotes (that are normally removed) inside the arguments.
	 */
	showQuoteCharacters?: boolean
	/**
	 * If true, parsing will include spaces into arguments automatically. 
	 * The next argument will happen when there's a new quote section.
	 * 
	 * Example: `arg 0 "arg 1" args 2` will parse as:
	 * 
	 * `["args 0", "args 1", "args 2"]`
	 * 
	 * Note that "args 0" and "args 2" didn't have quotes wrapping it. 
	 */
	separateByQuoteSections?: boolean
}