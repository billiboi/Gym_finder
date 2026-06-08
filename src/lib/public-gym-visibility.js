const ARCHIVED_VALUES = new Set(['1', 'true', 'yes', 'si', 'sì', 'archived', 'deleted']);

function clean(value) {
  return String(value ?? '').trim().toLowerCase();
}

function hasValue(value) {
  if (value === false) return false;
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function isArchivedFlag(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  return ARCHIVED_VALUES.has(clean(value));
}

export function isPublicActiveGym(gym) {
  if (!gym || typeof gym !== 'object') return false;

  if (hasValue(gym.deleted_at)) return false;
  if (hasValue(gym.deletedAt)) return false;
  if (hasValue(gym._deleted_at)) return false;
  if (hasValue(gym.weekly_hours?._deleted_at)) return false;
  if (isArchivedFlag(gym.archived)) return false;
  if (isArchivedFlag(gym.is_archived)) return false;

  return true;
}

export function publicGymVisibilityQueryParams(availableColumns = []) {
  const available = new Set(availableColumns);
  const params = [];

  for (const column of ['deleted_at', 'deletedAt', '_deleted_at']) {
    if (available.has(column)) params.push(`${column}=is.null`);
  }

  return params;
}
