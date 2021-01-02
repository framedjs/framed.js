import { ChatClient } from "twitch-chat-client";

export interface FramedTwitchMessageOptions {
	chatClient: ChatClient;
	channel: string;
	user: string;
}
