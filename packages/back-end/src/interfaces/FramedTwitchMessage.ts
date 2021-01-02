import { ChatClient } from "twitch-chat-client";

export interface FramedTwitchMessage {
	chatClient: ChatClient
	channel: string;
	user: string;
}
