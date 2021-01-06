export interface FramedArgumentOptions {
	/**
	 * If true, this puts the quotes (that are normally removed) inside the arguments.
	 */
	showQuoteCharacters?: boolean;

	/**
	 * If true, parsing will include quoted content into arguments.
	 * This will also parse parts where there may not be any quotes, but
	 * it is possible to infer what exactly would be in it.
	 *
	 * @example
	 * FramedMessage.getArgs(`arg 0 "arg 1" args 2`, {
	 * 	separateByQuoteSections: true
	 * });
	 * // Expected Result: ["args 0", "args 1", "args 2"]
	 * // Note that "args 0" and "args 2" didn't have quotes wrapping it.
	 */
	separateByQuoteSections?: boolean;

	/**
	 * If true, this will function mostly the same if separateByQuoteSections was true.
	 *
	 * The difference however is that it will only parse quoted content. If there is anything
	 * outside the quotes, the parse will return undefined.
	 *
	 * @example
	 * FramedMessage.getArgs(`"arg 0" "arg 1" "args 2"`, {
	 * 	strictSeparateQuoteSections: true
	 * });
	 * // Expected Result: ["args 0", "args 1", "args 2"]
	 *
	 * @example
	 * FramedMessage.getArgs(`"arg 0" arg 1`);
	 * // Expected Result: undefined
	 * // Note that `arg 1` didn't have any quotes wrapping it.
	 */
	strictSeparateQuoteSections?: boolean;

	/**
	 * If set to Flexible, parsing will include quoted content into arguments.
	 * This will also parse parts where there may not be any quotes, but
	 * would be possible to infer what exactly would be in it.
	 *
	 * If set to Strict, parsing will include quoted content into arguments.
	 * Unlike Flexible, parsing will return undefined if there are parts that
	 * isn't wrapped with quotes.
	 *
	 * @example
	 * FramedMessage.getArgs(`arg 0 "arg 1"`, {
	 * 	quoteSections: "flexible"
	 * });
	 * // Expected Result: ["args 0", "args 1"]
	 *
	 * @example
	 * FramedMessage.getArgs(`"arg 0" "arg 1"`, {
	 * 	quoteSections: "strict"
	 * });
	 * // Expected Result: ["args 0", "args 1"]
	 *
	 * @example
	 * FramedMessage.getArgs(`arg 0 "arg 1" arg 2`, {
	 * 	quoteSections: "strict"
	 * });
	 * // Expected Result: []
	 */
	quoteSections?: "strict" | "flexible";
}
