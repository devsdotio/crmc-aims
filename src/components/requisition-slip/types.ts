export interface RequisitionItem {
  id: string;
  qty: number | null;
  description: string;
  costCenterCode: string;
  suggestedDealer: string;
  purpose: string;
  estimatedCost: number | null;
}

export interface RequisitionSlipData {
  date: string; // ISO date
  items: RequisitionItem[];
  requisitionedBy: string;
  recommendingOfficePerson: string;
  budgetOfficer: string;
  approvedBy: {
    name: string;
    title: string;
  };
}
