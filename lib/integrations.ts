import "server-only"

export type AdapterResult = {
  provider: string
  status: "mock"
  message: string
}

export const mockCrmAdapter = {
  provider: "mock-crm",
  async syncLead(name: string): Promise<AdapterResult> {
    return {
      provider: this.provider,
      status: "mock",
      message: `Mock CRM accepted lead ${name}.`,
    }
  },
}

export const mockSlackAdapter = {
  provider: "mock-slack",
  async notify(channel: string, message: string): Promise<AdapterResult> {
    return {
      provider: this.provider,
      status: "mock",
      message: `Mock Slack posted to ${channel}: ${message}`,
    }
  },
}
