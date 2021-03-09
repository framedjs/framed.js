import { BaseMessage } from "../src/structures/BaseMessage";

function testVariation(
	emoji: string,
	content: string,
	newEmoteUndefined = false
) {
	test(`${emoji} ${content}`, () => {
		expect(
			BaseMessage.parseEmojiAndString(`${emoji} ${content}`)
		).toStrictEqual({
			newContent: newEmoteUndefined ? `${emoji} ${content}` : content,
			newEmote: newEmoteUndefined ? undefined : emoji,
		});
	});
}

testVariation("🥞", "Pancake");
testVariation("🧇", "Waffle");
testVariation("🟢", "Green");
testVariation("⌚", "Watch");
testVariation("↔️", "Some Symbol");
testVariation("👩", "Emoji Modifier Base");
testVariation("🙍🏿‍♀️", "Emoji Modifier Base followed by a modifier");
testVariation("invalid emoji", "let's see!", true);
