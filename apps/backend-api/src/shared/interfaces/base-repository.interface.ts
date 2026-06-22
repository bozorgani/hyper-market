export interface BaseRepository<T> {
  create(data: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  updateById(id: string, data: Partial<T>): Promise<T | null>;
  softDelete(id: string): Promise<T | null>;
}
