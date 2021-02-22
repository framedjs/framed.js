export interface ArgumentOptionsV2 {
	name: string;
	type: string;
	missing?: () => Promise<void>;
	optional?: boolean;
	defaultValue?: string;
}