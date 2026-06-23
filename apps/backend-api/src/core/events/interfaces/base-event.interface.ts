export interface BaseEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
}
