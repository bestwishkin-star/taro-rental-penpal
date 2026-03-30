export interface OverviewStat {
  label: string;
  value: string;
}

export interface OverviewSection {
  description: string;
  title: string;
}

export interface OverviewEntry {
  description: string;
  route: string;
  tag: string;
  title: string;
}

export interface OverviewPayload {
  entries: OverviewEntry[];
  sections: OverviewSection[];
  stats: OverviewStat[];
}
