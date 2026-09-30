export type StaticDrill =
  | { id: string; topic: string; kind: 'mcq'; q: string; options: string[]; answer: number; why: string; tags?: (string | null)[] }
  | { id: string; topic: string; kind: 'multi'; q: string; options: string[]; answers: number[]; why: string }
  | { id: string; topic: string; kind: 'order'; q: string; items: string[]; why: string }
  | { id: string; topic: string; kind: 'sort'; q: string; buckets: string[]; items: [string, number][]; why: string };

export type DrillRef = { kind: 'static'; id: string } | { kind: 'gen'; id: string; seed: number };
