import FramedMessage from "../src/structures/FramedMessage";

test(`Parses content by separating spaces, then into an array`, () => {
	const args = FramedMessage.getArgs("arg0 arg1 arg2");
	expect(args).toStrictEqual([`arg0`, `arg1`, `arg2`]);
});

test(`Shows quotes in contents, if settings apply`, () => {
	const args1 = FramedMessage.getArgs(
		`"arg 0" "arg 1 but more spaces" "arg 2"`,
		{
			showQuoteCharacters: true,
		}
	);
	expect(args1).toStrictEqual([
		`"arg 0"`,
		`"arg 1 but more spaces"`,
		`"arg 2"`,
	]);
	const args2 = FramedMessage.getArgs(
		`"arg 0" "arg 1 but more spaces" "arg 2"`,
		{
			showQuoteCharacters: false,
		}
	);
	expect(args2).toStrictEqual([
		`arg 0`,
		`arg 1 but more spaces`,
		`arg 2`,
	]);
});

test(`Parses content inside quotes`, () => {
	const args = FramedMessage.getArgs(
		`"arg 0" "arg 1 but more spaces" "arg 2"`
	);
	expect(args).toStrictEqual([`arg 0`, `arg 1 but more spaces`, `arg 2`]);
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
		separateByQuoteSections: true,
	});
	expect(args).toStrictEqual([`arg 0`, `arg 1`, `arg 2`]);
});

test(`Parse quoted in-between as a valid quote section`, () => {
	const args = FramedMessage.getArgs(`arg 0 "arg 1" arg 2`, {
		separateByQuoteSections: true,
	});
	expect(args).toStrictEqual([`arg 0`, `arg 1`, `arg 2`]);
});

test(`Doesn't trim spaces inside quotes`, () => {
	const args2 = FramedMessage.getArgs(`" test "`);
	expect(args2[0]).toBe(` test `);

	const args = FramedMessage.getArgs(`" test "`, {
		separateByQuoteSections: true,
	});
	expect(args[0]).toBe(` test `);
});

test(`Empty quote section is determined as valid data, and gets parsed`, () => {
	const argsNoQuoteSection = FramedMessage.getArgs(`""`);
	expect(argsNoQuoteSection).toStrictEqual([``]);

	const argsWithQuoteSection = FramedMessage.getArgs(`""`, {
		separateByQuoteSections: true,
	});
	expect(argsWithQuoteSection).toStrictEqual([``]);
});
