export class CreateTenantDto {
  name: string;
  eventsPerMonth?: number;
  alertsPerMonth?: number;
  description?: string;
  aiEnabled?: boolean; // M13: Enable AI anomaly scoring (default true)
}

export class UpdateTenantDto {
  name?: string;
  eventsPerMonth?: number;
  alertsPerMonth?: number;
  status?: 'active' | 'suspended' | 'deleted';
  description?: string;
  aiEnabled?: boolean; // M13: Toggle AI anomaly scoring per tenant
}
