import { applyDecorators } from "@nestjs/common";
import { ApiQuery } from "@nestjs/swagger";
import { defaultSort, paginationLength } from "@utils";

export const ApiDatatableQueries = () => {
	return applyDecorators(
		ApiQuery({
			name: "page",
			required: false,
			type: Number,
			description: "Page number for pagination (default: 1)",
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
			type: String,
			description: `Field to sort by (default: ${defaultSort})`,
			example: "name",
		}),
		ApiQuery({
			name: "sortDirection",
			required: false,
			enum: ["asc", "desc"],
			description: "Sort direction (default: desc)",
			example: "asc",
		}),
		ApiQuery({
			name: "filter",
			required: false,
			type: Object,
			description: "Filter object with key-value pairs",
			style: "deepObject",
			explode: true,
		}),
	);
};
