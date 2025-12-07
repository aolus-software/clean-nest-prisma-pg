export type PaginationResponse<T> = {
	data: T[];
	meta: {
		page: number;
		limit: number;
		totalCount: number;
		totalPages: number;
	};
};
