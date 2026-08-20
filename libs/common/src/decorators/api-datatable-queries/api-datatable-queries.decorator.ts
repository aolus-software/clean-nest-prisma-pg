import { applyDecorators } from "@nestjs/common";
import { ApiQuery } from "@nestjs/swagger";
import { defaultSort, paginationLength } from "@utils";

interface ApiDatatableQueriesOptions {
	/* The ?sort= values the endpoint's repository accepts. Pass the repository's
	   exported <entity>SortableFields so the documented list cannot drift from the
	   list that is actually enforced. */
	sortFields?: readonly string[];
	/* The filter[<key>] names the endpoint's repository accepts. Pass the
	   repository's exported <entity>FilterableFields. */
	filterFields?: readonly string[];
}

/* Documents the shared pagination, search, sort, and filter query parameters.
   When the caller supplies the repository's allow-lists, sort is rendered as an
   enum and the filter description names the accepted keys, so /docs shows the
   same values the repository validates against -- a mismatch there produces a
   400 the reader cannot predict. */
export const ApiDatatableQueries = (
	options: ApiDatatableQueriesOptions = {},
) => {
	const { sortFields, filterFields } = options;

	return applyDecorators(
		ApiQuery({
			name: "page",
			required: false,
			type: Number,
			description: `Page number for pagination (default: 1)`,
			example: 1,
		}),
		ApiQuery({
			name: "limit",
			required: false,
			type: Number,
			description: `Number of items per page (default: ${paginationLength})`,
			example: paginationLength,
		}),
		ApiQuery({
			name: "search",
			required: false,
			type: String,
			description: "Search term to filter results",
			example: "",
		}),
		ApiQuery({
			name: "sort",
			required: false,
			...(sortFields?.length ? { enum: [...sortFields] } : { type: String }),
			description: sortFields?.length
				? `Field to sort by (default: ${defaultSort}). Allowed: ${sortFields.join(", ")}. Anything else returns 400.`
				: `Field to sort by (default: ${defaultSort})`,
			example: defaultSort,
		}),
		ApiQuery({
			name: "sortDirection",
			required: false,
			enum: ["asc", "desc"],
			description: "Sort direction (default: desc). Anything else returns 400.",
			example: "asc",
		}),
		ApiQuery({
			name: "filter",
			required: false,
			type: Object,
			description: filterFields?.length
				? `Filter object, sent as filter[<key>]=<value>. Allowed keys: ${filterFields.join(", ")}. Anything else returns 400.`
				: "Filter object with key-value pairs",
			style: "deepObject",
			explode: true,
		}),
	);
};
