import { DateUtils } from "@utils/date/date.utils";

/* Expiry for a newly issued email-verification token. This is a function, not a
   constant: evaluating DateUtils.now() at module load would freeze one absolute
   timestamp at process start, so every token issued later in the process would
   inherit an expiry computed from boot time and the usable window would shrink
   as the process aged. Call it at the moment the token row is written. */
export function emailVerificationLifetime(): Date {
	return DateUtils.addHours(DateUtils.now(), 2).toDate();
}

/* Expiry for a newly issued password-reset token. Same reasoning as above. */
export function resetPasswordLifetime(): Date {
	return DateUtils.addHours(DateUtils.now(), 2).toDate();
}
