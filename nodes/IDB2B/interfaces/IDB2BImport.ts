export interface IDB2BImportResponse {
	success: boolean;
	message: string;
	imported_count?: number;
	failed_count?: number;
	errors?: Array<{
		row: number;
		field: string;
		error: string;
	}>;
	job_id?: string;
	status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface IDB2BImportTemplate {
	fields: Array<{
		name: string;
		type: string;
		required: boolean;
		description?: string;
	}>;
	sample_data?: Record<string, any>[];
	format?: 'csv' | 'excel';
}