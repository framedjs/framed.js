import { Utils } from "../src/index";

test(`Utils.formatHrTime adds trailing zeros if needed`, () => {
	const num = 42;
	const results = Utils.formatHrTime([num, 0]);
	expect(results).toBe(`${num}.000`);
});

test(`Utils.formatHrTime adds an "s" if requested`, () => {
	const results = Utils.formatHrTime([0, 123456789], true);
	expect(results).toBe("0.123s");
});
