import { Message } from "../src/structures/Message";

test(`Parses content by separating spaces, then into an array`, () => {
	const args = Message.getArgs("arg0 arg1 arg2");
	expect(args).toStrictEqual([`arg0`, `arg1`, `arg2`]);
});

test(`Shows quotes in contents, if settings apply`, () => {
	const args1 = Message.getArgs(`"arg 0" "arg 1" "arg 2"`, {
		showQuoteCharacters: true,
	});
	expect(args1).toStrictEqual([`"arg 0"`, `"arg 1"`, `"arg 2"`]);

	const args2 = Message.getArgs(`"arg 0" "arg 1" "arg 2"`, {
		showQuoteCharacters: false,
	});
	expect(args2).toStrictEqual([`arg 0`, `arg 1`, `arg 2`]);
});

test(`Parses content inside quotes`, () => {
	const args = Message.getArgs(`"arg 0" "arg 1 but spaces" "arg 2"`);
	expect(args).toStrictEqual([`arg 0`, `arg 1 but spaces`, `arg 2`]);
	const args2 = Message.getArgs(`"arg 0" "arg 1 but spaces"`);
	expect(args2).toStrictEqual([`arg 0`, `arg 1 but spaces`]);
});

test(`Trims the contents`, () => {
	const args = Message.getArgs(` 0 1 2 `);
	expect(args).toStrictEqual([`0`, `1`, `2`]);
});

test(`Parses content inside and outside quotes, with surrounding quoted sections`, () => {
	const args = Message.getArgs(`"arg 0" arg 1 "arg 2"`);
	expect(args).toStrictEqual([`arg 0`, `arg`, `1`, `arg 2`]);
});

test(`Parses content inside and outside quotes, with surrounding un-quoted sections`, () => {
	const args = Message.getArgs(`arg 0 "arg 1" arg 2`);
	expect(args).toStrictEqual([`arg`, `0`, `arg 1`, `arg`, `2`]);
});

test(`Parses non-quoted in-between as a valid quote section`, () => {
	const args = Message.getArgs(`"arg 0" arg 1 "arg 2"`, {
		quoteSections: "flexible",
	});
	expect(args).toStrictEqual([`arg 0`, `arg 1`, `arg 2`]);
});

test(`Parse quoted in-betweens as a valid quote section`, () => {
	const args = Message.getArgs(`arg 0 "arg 1" arg 2`, {
		quoteSections: "flexible",
	});
	expect(args).toStrictEqual([`arg 0`, `arg 1`, `arg 2`]);

	const detailedArgs = Message.getDetailedArgs(`arg 0 "arg 1" arg 2`, {
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
	const args2 = Message.getArgs(`" test "`);
	expect(args2[0]).toBe(` test `);

	const args = Message.getArgs(`" test "`, {
		quoteSections: "flexible",
	});
	expect(args[0]).toBe(` test `);
});

test(`Empty quote section is determined as valid data, and gets parsed`, () => {
	const argsNoQuoteSection = Message.getArgs(`""`);
	expect(argsNoQuoteSection).toStrictEqual([``]);

	const argsWithQuoteSection = Message.getArgs(`""`, {
		quoteSections: "flexible",
	});
	expect(argsWithQuoteSection).toStrictEqual([``]);
});

test(`Parses codeblocks as one argument`, () => {
	const expectedResult = '```this is a "test" with code blocks```';
	const args = Message.getArgs(expectedResult);
	expect(args[0]).toStrictEqual(expectedResult);
});

test(`Parses codeblocks as one argument, in quotes`, () => {
	const inputData = '"```this is a "test" with code blocks```"';
	const expectedResult = '```this is a "test" with code blocks```';
	const args = Message.getArgs(inputData);
	expect(args[0]).toStrictEqual(expectedResult);
});

test(`Strict option returns empty array if failed to parse strictly`, () => {
	let inputData = '"arg 0" arg 1 "args 2"';
	let args = Message.getArgs(inputData, {
		quoteSections: "strict",
	});
	expect(args).toStrictEqual([]);

	inputData = '"arg 0" " arg 1" "arg 2"';
	args = Message.getArgs(inputData, {
		quoteSections: "strict",
	});
	expect(args).toStrictEqual([`arg 0`, ` arg 1`, `arg 2`]);
});

test(`Flexible parse doesn't add another space to the next quoted section`, () => {
	const inputData = `"⭐ Test Parse" "⭐ New Parse"`;
	const args = Message.getArgs(inputData, {
		quoteSections: "flexible",
	});
	expect(args).toStrictEqual(["⭐ Test Parse", "⭐ New Parse"]);
});
