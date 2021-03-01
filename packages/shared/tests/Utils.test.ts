import { Utils } from "../src/index";

test(`Utils.formatHrTime adds an "s" if requested`, () => {
	expect(Utils.formatHrTime([0, 123456789], true)).toBe("0.123s");
});

test(`Utils.formatHrTime handles "0"s padding correctly`, () => {
	expect(Utils.formatHrTime([0, 12345678])).toBe("0.012");
	expect(Utils.formatHrTime([0, 1234567])).toBe("0.001");
});


