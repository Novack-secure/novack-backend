import axios, { AxiosInstance } from "axios";

export interface DeepseeChatRequest {
  supplierId: string;
  prompt: string;
  context: Record<string, any>;
}

export interface DeepseeChatResponse {
  text: string;
  raw?: any;
}

export class DeepseeClient {
  private readonly apiUrl: string;
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;

  constructor(apiUrl?: string, apiKey?: string) {
    // Aceptar ambas convenciones: DEEPSEE_* (interna) y DEEPSEEK_* (tu .env)
    this.apiUrl =
      apiUrl ||
      process.env.DEEPSEE_API_URL ||
      process.env.DEEPSEEK_BASE_URL ||
      "";
    this.apiKey =
      apiKey || process.env.DEEPSEE_API_KEY || process.env.DEEPSEEK_API_KEY;
    this.http = axios.create({
      baseURL: this.apiUrl,
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      timeout: 15000,
    });
  }

  async chat(request: DeepseeChatRequest): Promise<DeepseeChatResponse> {
    if (!this.apiUrl) {
      throw new Error("DEEPSEE_API_URL no configurado");
    }

    try {
      const { data } = await this.http.post("/chat", request);
      return { text: (data && data.text) ? data.text : "", raw: data };
    } catch (err: any) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      throw new Error(`Deepsee error ${status ?? "unknown"}: ${JSON.stringify(body)}`);
    }
  }
}

