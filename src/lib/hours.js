const OPEN_UNKNOWN_PATTERNS = ['orari da verificare', 'n.d.', 'nd', 'da verificare'];
const WEEKDAY_MAP = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function dayIndexFromLabel(label) {
  const short = normalizeText(label).replace('.', '');
  if (short.startsWith('lun')) return 1;
  if (short.startsWith('mar')) return 2;
  if (short.startsWith('mer')) return 3;
  if (short.startsWith('gio')) return 4;
  if (short.startsWith('ven')) return 5;
  if (short.startsWith('sab')) return 6;
  if (short.startsWith('dom')) return 0;
  return -1;
}

function containsUnknownPattern(hoursInfo) {
  const text = normalizeText(hoursInfo);
  return OPEN_UNKNOWN_PATTERNS.some((pattern) => text.includes(pattern));
}

function parseLocalWeekdayAndMinute(now, timeZone) {
  const shortWeekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone
  })
    .format(now)
    .toLowerCase();

  const dayIndex = WEEKDAY_MAP[shortWeekday];
  if (!Number.isInteger(dayIndex)) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? NaN);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? NaN);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return { dayIndex, minuteOfDay: hour * 60 + minute };
}

function extractIntervalsForDay(hoursInfo, targetDayIndex) {
  if (containsUnknownPattern(hoursInfo)) {
    return null;
  }

  const chunks = String(hoursInfo || '')
    .split('|')
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (!chunks.length) {
    return null;
  }

  for (const chunk of chunks) {
    const match = chunk.match(/^([A-Za-z.]+)\s+(.+)$/);
    if (!match) continue;

    const dayLabel = match[1];
    const expression = match[2].trim();
    if (dayIndexFromLabel(dayLabel) !== targetDayIndex) continue;

    if (normalizeText(expression).includes('chiuso')) {
      return [];
    }

    const ranges = [];
    const pattern = /(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?/g;
    let timeMatch = pattern.exec(expression);

    while (timeMatch) {
      const startHour = Number(timeMatch[1]);
      const startMinute = Number(timeMatch[2] || '0');
      const endHour = Number(timeMatch[3]);
      const endMinute = Number(timeMatch[4] || '0');

      const start = startHour * 60 + startMinute;
      const end = endHour * 60 + endMinute;

      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        ranges.push({ start, end });
      }

      timeMatch = pattern.exec(expression);
    }

    return ranges;
  }

  return null;
}

export function isGymOpenNow(hoursInfo, options = {}) {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? 'Europe/Rome';
  const localTime = parseLocalWeekdayAndMinute(now, timeZone);
  if (!localTime) return null;

  const intervals = extractIntervalsForDay(hoursInfo, localTime.dayIndex);
  if (intervals === null) return null;
  if (!intervals.length) return false;

  return intervals.some(
    ({ start, end }) => localTime.minuteOfDay >= start && localTime.minuteOfDay < end
  );
}
