import Discord from "discord.js";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export default class Response {
	@PrimaryColumn()
	id!: string;

	@Column()
	response!: {
		list: {
			content: string;
			command?: string;
			responseId?: string;
			discord?: {
				channelsToSendTo?: Discord.Channel[];
				embeds?: Discord.MessageEmbed[];
			};
		}[];
	};
}
