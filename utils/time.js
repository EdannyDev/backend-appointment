// Convertir "HH:MM" a minutos desde medianoche
export const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Construir Date con fecha y hora
export const buildDateTime = (date, time) => {
  let baseDate;
  if (date instanceof Date) baseDate = new Date(date);
  else {
    const [y, m, d] = date.split('-').map(Number);
    baseDate = new Date(y, m - 1, d);
  }
  const [h, min] = time.split(':').map(Number);
  baseDate.setHours(h, min, 0, 0);
  return baseDate;
};

// Validar si los minutos son múltiplos de un intervalo
export const isTimeMultipleOf = (time, interval) => {
  const [, minutes] = time.split(':').map(Number);
  return minutes % interval === 0;
};