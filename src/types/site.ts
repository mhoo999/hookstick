export interface Site {
  id: string;
  name: string;
  url: string;
  baseUrl: string;
}

export interface CrawlConfig {
  daysToSearch: number;
} 