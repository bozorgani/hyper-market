import { UserRole } from '../users/enums/user-role.enum';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: ['*'],
  [UserRole.ADMIN]: [
    'products.create',
    'products.update',
    'products.delete',
    'categories.create',
    'categories.update',
    'categories.delete',
    'orders.cancel',
    'users.read',
    'users.ban',
    'vendors.approve',
  ],
  [UserRole.VENDOR]: ['products.create', 'products.update'],
  [UserRole.DELIVERY]: [],
  [UserRole.CUSTOMER]: [],
};
