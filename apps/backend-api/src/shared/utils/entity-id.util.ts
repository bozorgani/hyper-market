import { Types } from 'mongoose';

export function getEntityId(entity: unknown): string {
  if (entity instanceof Types.ObjectId) {
    return entity.toHexString();
  }

  const withId = entity as { _id?: Types.ObjectId | string; id?: string };

  if (withId._id instanceof Types.ObjectId) {
    return withId._id.toHexString();
  }

  if (typeof withId._id === 'string') {
    return withId._id;
  }

  if (typeof withId.id === 'string') {
    return withId.id;
  }

  return String(entity);
}
