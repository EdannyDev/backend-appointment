// Convierte "HH:MM" a minutos totales
export const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Crea un objeto Date combinando una fecha y una hora
export const buildDateTime = (date, time) => {
  let baseDate;

  if (date instanceof Date) {
    baseDate = new Date(date);
  } else {
    const [y, m, d] = date.split('-').map(Number);
    baseDate = new Date(y, m - 1, d);
  }

  const [h, min] = time.split(':').map(Number);
  baseDate.setHours(h, min, 0, 0);
  return baseDate;
};

// Verifica si los minutos de una hora son múltiplo de un intervalo
export const isTimeMultipleOf = (time, interval) => {
  const [, minutes] = time.split(':').map(Number);
  return minutes % interval === 0;
};

// Convierte una hora "HH:MM" a formato de 12 horas
export const formatTime12h = (time) => {
  if (!time) return '';

  const timeStr = time instanceof Date
    ? `${String(time.getUTCHours()).padStart(2,'0')}:${String(time.getUTCMinutes()).padStart(2,'0')}`
    : String(time);

  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'p.m.' : 'a.m.';
  const hour12 = h % 12 === 0 ? 12 : h % 12;

  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

// Convierte una fecha a un formato más legible
export const formatDateLong = (dateStr) => {
  if (!dateStr) return '';

  let date;
  if (dateStr instanceof Date) {
    const y = dateStr.getFullYear();
    const m = String(dateStr.getMonth() + 1).padStart(2, '0');
    const d = String(dateStr.getDate()).padStart(2, '0');
    date = new Date(`${y}-${m}-${d}T00:00:00`);
  } else {
    date = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
  }

  const weekday = date.toLocaleDateString('es-MX', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('es-MX', { month: 'long' });
  const year = date.getFullYear();

  return `${weekday} ${day} de ${month} de ${year}`;
};