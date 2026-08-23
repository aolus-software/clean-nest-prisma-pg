import { BadRequestException } from "@nestjs/common";
import { DateUtils } from "@utils";
import { I18nContext } from "nestjs-i18n";

export type DateRangeFilter = { gte: Date; lte: Date };

/* Parses a `filter[<key>]=start[,end]` value into an inclusive range.

   Three things this exists to get right, each of which was wrong when written
   inline at the call site:

   - The end of the range is snapped to the END of that day. These are timestamp
     columns, so `lte: 2024-12-31T00:00:00` excludes everything recorded during
     31 December — an inclusive-looking range that silently drops its last day.
   - An unparseable date, a reversed range, or more than two comma-separated
     parts is rejected with a 400. Left unchecked they become `Invalid Date`,
     reach the driver, and surface as a 500 or match nothing at all.
   - A single date means that whole day, not "from midnight onwards".

   Timezone note: DateUtils resolves a bare YYYY-MM-DD in the application's
   configured timezone, so the window lands on the calendar day the caller
   meant rather than the host's. */
export function parseDateRangeFilter(
	value: string,
	key: string,
): DateRangeFilter {
	const reject = (): never => {
		throw new BadRequestException(
			I18nContext.current()?.t("message.common.invalid_filter_field") ??
				`Invalid date filter for "${key}"`,
		);
	};

	const parts = value
		.split(",")
		.map((part) => part.trim())
		.filter((part) => part.length > 0);

	if (parts.length === 0 || parts.length > 2) {
		reject();
	}

	const start = DateUtils.parse(parts[0]);
	const end = DateUtils.parse(parts[1] ?? parts[0]);

	if (!start.isValid() || !end.isValid()) {
		reject();
	}

	const from = start.startOf("day");
	const to = end.endOf("day");

	if (from.isAfter(to)) {
		reject();
	}

	return { gte: from.toDate(), lte: to.toDate() };
}
