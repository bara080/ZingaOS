import { CATEGORIES } from '../constants/categories';
import { roleLabelMap, ROLES } from '../roles';

export const roleSelectOptions = ROLES.map((role) => ({
  value: role,
  label: roleLabelMap[role],
}));

export const categorySelectOptions = CATEGORIES.map((cat) => ({
  value: cat.value,
  label: cat.label,
}));
