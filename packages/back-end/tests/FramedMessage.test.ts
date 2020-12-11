import { QuoteSections } from "../src/interfaces/FramedMessageArgsSettings";
import FramedMessage from "../src/structures/FramedMessage";

test(`Parses content by separating spaces, then into an array`, () => {
	const args = FramedMessage.getArgs("arg0 arg1 arg2");
	expect(args).toStrictEqual([`arg0`, `arg1`, `arg2`]);
});

test(`Shows quotes in contents, if settings apply`, () => {
	const args1 = FramedMessage.getArgs(`"arg 0" "arg 1" "arg 2"`, {
		showQuoteCharacters: true,
	});
	expect(args1).toStrictEqual([`"arg 0"`, `"arg 1"`, `"arg 2"`]);

	const args2 = FramedMessage.getArgs(`"arg 0" "arg 1" "arg 2"`, {
		showQuoteCharacters: false,
	});
	expect(args2).toStrictEqual([`arg 0`, `arg 1`, `arg 2`]);
});

test(`Parses content inside quotes`, () => {
	const args = FramedMessage.getArgs(`"arg 0" "arg 1 but spaces" "arg 2"`);
	expect(args).toStrictEqual([`arg 0`, `arg 1 but spaces`, `arg 2`]);
	const args2 = FramedMessage.getArgs(`"arg 0" "arg 1 but spaces"`);
	expect(args2).toStrictEqual([`arg 0`, `arg 1 but spaces`]);
});

test(`Trims the contents`, () => {
	const args = FramedMessage.getArgs(` 0 1 2 `);
	expect(args).toStrictEqual([`0`, `1`, `2`]);
});

test(`Parses content inside and outside quotes, with surrounding quoted sections`, () => {
	const args = FramedMessage.getArgs(`"arg 0" arg 1 "arg 2"`);
	expect(args).toStrictEqual([`arg 0`, `arg`, `1`, `arg 2`]);
});

test(`Parses content inside and outside quotes, with surrounding un-quoted sections`, () => {
	const args = FramedMessage.getArgs(`arg 0 "arg 1" arg 2`);
	expect(args).toStrictEqual([`arg`, `0`, `arg 1`, `arg`, `2`]);
});

test(`Parses non-quoted in-between as a valid quote section`, () => {
	const args = FramedMessage.getArgs(`"arg 0" arg 1 "arg 2"`, {
		quoteSections: QuoteSections.Flexible,
	});
	expect(args).toStrictEqual([`arg 0`, `arg 1`, `arg 2`]);
});

test(`Parse quoted in-betweens as a valid quote section`, () => {
	const args = FramedMessage.getArgs(`arg 0 "arg 1" arg 2`, {
		quoteSections: QuoteSections.Flexible,
	});
	expect(args).toStrictEqual([`arg 0`, `arg 1`, `arg 2`]);

	const detailedArgs = FramedMessage.getDetailedArgs(`arg 0 "arg 1" arg 2`, {
		quoteSections: QuoteSections.Flexible,
	});
	expect(detailedArgs).toStrictEqual([
		{
			argument: "arg 0",
			untrimmedArgument: "arg 0 ",
			nonClosedQuoteSection: false,
			wrappedInQuotes: false,
		},
		{
			argument: "arg 1",
			untrimmedArgument: "arg 1",
			nonClosedQuoteSection: false,
			wrappedInQuotes: true,
		},
		{
			argument: "arg 2",
			untrimmedArgument: " arg 2",
			nonClosedQuoteSection: false,
			wrappedInQuotes: false,
		},
	]);
});

test(`Doesn't trim spaces inside quotes`, () => {
	const args2 = FramedMessage.getArgs(`" test "`);
	expect(args2[0]).toBe(` test `);

	const args = FramedMessage.getArgs(`" test "`, {
		quoteSections: QuoteSections.Flexible,
	});
	expect(args[0]).toBe(` test `);
});

test(`Empty quote section is determined as valid data, and gets parsed`, () => {
	const argsNoQuoteSection = FramedMessage.getArgs(`""`);
	expect(argsNoQuoteSection).toStrictEqual([``]);

	const argsWithQuoteSection = FramedMessage.getArgs(`""`, {
		quoteSections: QuoteSections.Flexible,
	});
	expect(argsWithQuoteSection).toStrictEqual([``]);
});

test(`Parses codeblocks as one argument`, () => {
	const expectedResult = '```this is a "test" with code blocks```';
	const args = FramedMessage.getArgs(expectedResult);
	expect(args[0]).toStrictEqual(expectedResult);
});

test(`Parses codeblocks as one argument, in quotes`, () => {
	const inputData = '"```this is a "test" with code blocks```"';
	const expectedResult = '```this is a "test" with code blocks```';
	const args = FramedMessage.getArgs(inputData);
	expect(args[0]).toStrictEqual(expectedResult);
});

test(`Strict option returns empty array if failed to parse strictly`, () => {
	let inputData = '"arg 0" arg 1 "args 2"';
	let args = FramedMessage.getArgs(inputData, {
		quoteSections: QuoteSections.Strict,
	});
	expect(args).toStrictEqual([]);

	inputData = '"arg 0" " arg 1" "arg 2"';
	args = FramedMessage.getArgs(inputData, {
		quoteSections: QuoteSections.Strict,
	});
	expect(args).toStrictEqual([`arg 0`, ` arg 1`, `arg 2`]);
});

test(`Flexible parse doesn't add another space to the next quoted section`, () => {
	const inputData = `"⭐ Test Parse" "⭐ New Parse"`;
	const args = FramedMessage.getArgs(inputData, {
		quoteSections: QuoteSections.Flexible,
	});
	expect(args).toStrictEqual(["⭐ Test Parse", "⭐ New Parse"]);
});
