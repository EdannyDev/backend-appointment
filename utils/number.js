// Validar si un número es múltiplo de otro
export const isMultipleOf = (value, base) => {
  return Number.isInteger(value) && value % base === 0;
};