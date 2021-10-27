import { oneLine } from "common-tags";
import { BaseMessage } from "../src/structures/BaseMessage";

const leftDoubleQuote = "“";
const rightDoubleQuote = "”";

test(`Parses content by separating spaces, then into an array`, () => {
	const args = BaseMessage.getArgs("arg0 arg1 arg2");
	expect(args).toStrictEqual([`arg0`, `arg1`, `arg2`]);
});

test(`Shows quotes in contents, if settings apply`, () => {
	const args1 = BaseMessage.getArgs(`"arg 0" "arg 1" "arg 2"`, {
		showQuoteCharacters: true,
	});
	expect(args1).toStrictEqual([`"arg 0"`, `"arg 1"`, `"arg 2"`]);

	const args2 = BaseMessage.getArgs(`"arg 0" "arg 1" "arg 2"`, {
		showQuoteCharacters: false,
	});
	expect(args2).toStrictEqual([`arg 0`, `arg 1`, `arg 2`]);
});

test(`Parses content inside quotes`, () => {
	const args = BaseMessage.getArgs(`"arg 0" "arg 1 but spaces" "arg 2"`);
	expect(args).toStrictEqual([`arg 0`, `arg 1 but spaces`, `arg 2`]);
	const args2 = BaseMessage.getArgs(`"arg 0" "arg 1 but spaces"`);
	expect(args2).toStrictEqual([`arg 0`, `arg 1 but spaces`]);
});

test(`Parses content inside quotes, but using iPhone quotes`, () => {
	const inputData = oneLine`
		${leftDoubleQuote}arg 0${rightDoubleQuote}
		${leftDoubleQuote}arg 1 but spaces${rightDoubleQuote}
		${leftDoubleQuote}arg 2${rightDoubleQuote}`;
	const args = BaseMessage.getArgs(inputData);
	expect(args).toStrictEqual([`arg 0`, `arg 1 but spaces`, `arg 2`]);
});

test(`Do not have improper quote combinations per quoted section`, () => {
	// Tests left double quotes inside left double quotes
	let inputData = oneLine`
		${leftDoubleQuote}arg 0${leftDoubleQuote}
		arg 1 but spaces${rightDoubleQuote}
		${leftDoubleQuote}arg 2${rightDoubleQuote}`;
	let args = BaseMessage.getArgs(inputData);
	expect(args).toStrictEqual([
		`arg 0${leftDoubleQuote} arg 1 but spaces`,
		`arg 2`,
	]);

	// Tests right double quotes as starting
	inputData = oneLine`
		${rightDoubleQuote}arg 0${rightDoubleQuote}
		arg 1`;
	args = BaseMessage.getArgs(inputData);
	expect(args).toStrictEqual([
		`${rightDoubleQuote}arg`,
		`0${rightDoubleQuote}`,
		`arg`,
		`1`,
	]);

	// Tests single quotes inside iPhone quotes
	inputData = oneLine`
		"${leftDoubleQuote}arg 0${rightDoubleQuote} aa"
		"arg 1"`;
	args = BaseMessage.getArgs(inputData);
	expect(args).toStrictEqual([
		`${leftDoubleQuote}arg 0${rightDoubleQuote} aa`,
		`arg 1`,
	]);
});

test(`Trims the contents`, () => {
	const args = BaseMessage.getArgs(` 0 1 2 `);
	expect(args).toStrictEqual([`0`, `1`, `2`]);
});

test(`Parses content inside and outside quotes, with surrounding quoted sections`, () => {
	const args = BaseMessage.getArgs(`"arg 0" arg 1 "arg 2"`);
	expect(args).toStrictEqual([`arg 0`, `arg`, `1`, `arg 2`]);
});

test(`Parses content inside and outside quotes, with surrounding un-quoted sections`, () => {
	const args = BaseMessage.getArgs(`arg 0 "arg 1" arg 2`);
	expect(args).toStrictEqual([`arg`, `0`, `arg 1`, `arg`, `2`]);
});

test(`Parses non-quoted in-between as a valid quote section`, () => {
	const args = BaseMessage.getArgs(`"arg 0" arg 1 "arg 2"`, {
		quoteSections: "flexible",
	});
	expect(args).toStrictEqual([`arg 0`, `arg 1`, `arg 2`]);
});

test(`Parse quoted in-betweens as a valid quote section`, () => {
	const args = BaseMessage.getArgs(`arg 0 "arg 1" arg 2`, {
		quoteSections: "flexible",
	});
	expect(args).toStrictEqual([`arg 0`, `arg 1`, `arg 2`]);

	const detailedArgs = BaseMessage.getDetailedArgs(`arg 0 "arg 1" arg 2`, {
		quoteSections: "flexible",
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
	const args2 = BaseMessage.getArgs(`" test "`);
	expect(args2[0]).toBe(` test `);

	const args = BaseMessage.getArgs(`" test "`, {
		quoteSections: "flexible",
	});
	expect(args[0]).toBe(` test `);
});

test(`Empty quote section is determined as valid data, and gets parsed`, () => {
	const argsNoQuoteSection = BaseMessage.getArgs(`""`);
	expect(argsNoQuoteSection).toStrictEqual([``]);

	const argsWithQuoteSection = BaseMessage.getArgs(`""`, {
		quoteSections: "flexible",
	});
	expect(argsWithQuoteSection).toStrictEqual([``]);
});

test(`Parses codeblocks as one argument`, () => {
	const expectedResult = '```this is a "test" with code blocks```';
	const args = BaseMessage.getArgs(expectedResult);
	expect(args[0]).toStrictEqual(expectedResult);
});

test(`Parses codeblocks as one argument, in quotes`, () => {
	const inputData = '"```this is a "test" with code blocks```"';
	const expectedResult = '```this is a "test" with code blocks```';
	const args = BaseMessage.getArgs(inputData);
	expect(args[0]).toStrictEqual(expectedResult);
});

test(`Strict option returns empty array if failed to parse strictly`, () => {
	let inputData = '"arg 0" arg 1 "args 2"';
	let args = BaseMessage.getArgs(inputData, {
		quoteSections: "strict",
	});
	expect(args).toStrictEqual([]);

	inputData = '"arg 0" " arg 1" "arg 2"';
	args = BaseMessage.getArgs(inputData, {
		quoteSections: "strict",
	});
	expect(args).toStrictEqual([`arg 0`, ` arg 1`, `arg 2`]);
});

test(`Flexible parse doesn't add another space to the next quoted section`, () => {
	const inputData = `"⭐ Test Parse" "⭐ New Parse"`;
	const args = BaseMessage.getArgs(inputData, {
		quoteSections: "flexible",
	});
	expect(args).toStrictEqual(["⭐ Test Parse", "⭐ New Parse"]);
});
