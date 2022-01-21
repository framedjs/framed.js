export interface CooldownOptions {
	/**
	 * Should the cooldown be checked automatically?
	 * @default true
	 */
	checkAutomatically?: boolean;

	/**
	 * Should the cooldown be set automatically?
	 * @default true
	 */
	setAutomatically?: boolean;

	/** Time is in seconds. */
	time: number;
}
