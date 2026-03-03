export interface IDB2BContact {
	id?: string;
	organization_id?: string;
	name: string;
	phone_number?: string;
	email?: string;
	user_id?: string;
	lead_id?: string;

	// Company information embedded (for CRM compatibility)
	company?: string;                // Company name (like Notion)
	company_id?: string;             // Link to lead/company if needed

	// CRM-specific fields (matching Notion structure)
	status?: 'Lost' | 'Qualified' | 'Proposal' | 'Closed' | 'Lead' | 'Negotiation';
	priority?: 'High' | 'Medium' | 'Low';
	estimated_value?: number;        // Deal value
	account_owner?: string;          // Sales owner
	position?: string;               // Job title

	// System fields
	created_at?: string;
	updated_at?: string;
	lead?: any;
	favorites?: boolean;
	tags?: Array<{
		id: string;
		organization_id: string;
		name: string;
	}>;
}