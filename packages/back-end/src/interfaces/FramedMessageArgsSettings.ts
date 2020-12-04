export interface FramedMessageArgsSettings {
	/**
	 * If true, this puts the quotes (that are normally removed) inside the arguments.
	 */
	showQuoteCharacters?: boolean;

	/**
	 * If true, parsing will include quoted content into arguments.
	 * This will also parse parts where there may not be any quotes, but
	 * it is possible to infer what exactly would be in it.
	 *
	 * Example: `arg 0 "arg 1" args 2` will parse as:
	 *
	 * `["args 0", "args 1", "args 2"]`
	 *
	 * Note that "args 0" and "args 2" didn't have quotes wrapping it.
	 */
	separateByQuoteSections?: boolean;

	/**
	 * If true, this will function mostly the same if separateByQuoteSections was true.
	 *
	 * The difference however is that it will only parse quoted content. If there is anything
	 * outside the quotes, the parse will return undefined.
	 *
	 * Example: `"arg 0" "arg 1" "args 2"` will parse as:
	 *
	 * `["args 0", "args 1", "args 2"]`
	 *
	 * Example: `"arg 0" arg 1` will parse as:
	 *
	 * `undefined`
	 *
	 * Note that `arg 1` didn't have any quotes wrapping it.
	 */
	strictSeparateQuoteSections?: boolean;

	/**
	 * If set to Flexible, parsing will include quoted content into arguments.
	 * This will also parse parts where there may not be any quotes, but
	 * would be possible to infer what exactly would be in it.
	 *
	 * Examples: 
	 * - `arg 0 "arg 1"` will parse as: `["args 0", "args 1"]`
	 *
	 * If set to Strict, parsing will include quoted content into arguments.
	 * Unlike Flexible, parsing will return undefined if there are parts that 
	 * isn't wrapped with quotes.
	 * 
	 * Examples: 
	 * - `"arg 0" "arg 1"` will parse as `["args 0", "args 1"]`.
	 * - `arg 0 "arg 1" arg 2` will parse as `[]`.
	 *
	 * If quoteSections is set to undefined, the message won't be parsed through 
	 * quoted content, but rather spaces.
	 */
	quoteSections?: QuoteSections;
}

export enum QuoteSections {
	Flexible,
	Strict,
}
