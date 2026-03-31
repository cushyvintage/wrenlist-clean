import { PoshmarkClient } from "./client.js";

export interface PoshmarkConfig {
  tld: string;
}

export function createPoshmarkServices(config: PoshmarkConfig) {
  const client = new PoshmarkClient(config.tld);
  return { client };
}

