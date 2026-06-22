import { UserRole } from '../users/enums/user-role.enum';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: ['*'],
  [UserRole.ADMIN]: [
    'products.create',
    'products.update',
    'products.delete',
    'orders.cancel',
    'users.ban',
    'vendors.approve',
  ],
  [UserRole.VENDOR]: ['products.create', 'products.update'],
  [UserRole.DELIVERY]: [],
  [UserRole.CUSTOMER]: [],
};
