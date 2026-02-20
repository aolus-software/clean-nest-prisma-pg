import { DateUtils } from "@utils/date/date.utils";

export const emailVerificationLifetime = DateUtils.addHours(
	DateUtils.now(),
	2,
).toDate();

export const resetPasswordLifetime = DateUtils.addHours(
	DateUtils.now(),
	2,
).toDate();
