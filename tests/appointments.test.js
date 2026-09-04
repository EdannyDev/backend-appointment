import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getAvailableSlots, validateAndGetEndTime } from '../services/appointments.js';

const BUFFER_MINUTES = 30;

// Devuelve una fecha futura en formato YYYY-MM-DD, a partir de hoy
const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// Mock de conexión: Entrega respuestas predefinidas a las queries, y registra las queries que se hicieron
const createMockConn = (responses) => {
  const queue = [...responses];
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (queue.length === 0)
        throw new Error(`Query inesperada, no había respuesta preparada: ${sql}`);
      return queue.shift();
    },
  };
};

describe('getAvailableSlots', () => {
  test('devuelve lista vacía cuando el día está bloqueado', async () => {
    const conn = createMockConn([
      [[{ id: 1 }]],
    ]);

    const result = await getAvailableSlots(1, addDays(5), conn);

    assert.deepEqual(result.data, []);
  });

  // Más allá del rango permitido no debe ni siquiera consultar la BD
  test('devuelve lista vacía sin consultar la BD si la fecha excede el máximo permitido', async () => {
    const conn = createMockConn([]);

    const result = await getAvailableSlots(1, addDays(100), conn);

    assert.deepEqual(result.data, []);
  });

  // Servicio inexistente o inactivo
  test('lanza 404 si el servicio no existe o está inactivo', async () => {
    const conn = createMockConn([
      [[]],
      [[]],
    ]);

    await assert.rejects(
      () => getAvailableSlots(999, addDays(5), conn),
      (err) => {
        assert.equal(err.status, 404);
        return true;
      }
    );
  });

  // El negocio no atiende ese día de la semana
  test('devuelve lista vacía si el negocio no atiende ese día', async () => {
    const conn = createMockConn([
      [[]],
      [[{ duration: 30 }]],
      [[]],
    ]);

    const result = await getAvailableSlots(1, addDays(5), conn);

    assert.deepEqual(result.data, []);
  });

  // Cálculo base: sin citas existentes, los slots deben calcularse cada 15 minutos
  test('calcula correctamente los slots de un día completo sin citas existentes', async () => {
    const conn = createMockConn([
      [[]],
      [[{ duration: 60 }]],
      [[{ start_time: '09:00:00', end_time: '11:00:00' }]],
      [[]],
    ]);

    const result = await getAvailableSlots(1, addDays(5), conn);

    assert.deepEqual(result.data, ['09:00', '09:15', '09:30', '09:45', '10:00']);
  });

  // Con una cita existente, los slots que se traslapan deben excluirse
  test('excluye únicamente los slots que se traslapan con una cita existente', async () => {
    const conn = createMockConn([
      [[]],
      [[{ duration: 30 }]],
      [[{ start_time: '09:00:00', end_time: '11:00:00' }]],
      [[{ start_time: '09:30:00', end_time: '10:00:00' }]],
    ]);

    const result = await getAvailableSlots(1, addDays(5), conn);

    assert.deepEqual(result.data, ['09:00', '10:00', '10:15', '10:30']);
  });

  // El buffer de anticipación solo aplica cuando la fecha consultada es hoy
  test('respeta el buffer de anticipación al consultar horarios para hoy', async () => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const conn = createMockConn([
      [[]],
      [[{ duration: 15 }]],
      [[{ start_time: '00:00:00', end_time: '23:45:00' }]],
      [[]],
    ]);

    const result = await getAvailableSlots(1, todayStr, conn);

    const bufferThreshold = now.getHours() * 60 + now.getMinutes() + BUFFER_MINUTES;

    assert.ok(result.data.length > 0, 'debería haber al menos un slot disponible más tarde en el día');
    for (const slot of result.data) {
      const [h, m] = slot.split(':').map(Number);
      assert.ok(h * 60 + m > bufferThreshold, `el slot ${slot} no debería estar dentro del buffer`);
    }
  });
});

describe('validateAndGetEndTime', () => {
  test('lanza 404 si el servicio no existe o está inactivo', async () => {
    const conn = createMockConn([
      [[]],
    ]);

    await assert.rejects(
      () => validateAndGetEndTime({ service_id: 999, date: addDays(5), start_time: '09:00' }, conn),
      (err) => {
        assert.equal(err.status, 404);
        return true;
      }
    );
  });

  // La cita no puede caer en un día bloqueado
  test('lanza error si la fecha está bloqueada', async () => {
    const conn = createMockConn([
      [[{ duration: 30 }]],
      [[{ id: 1 }]],
    ]);

    await assert.rejects(
      () => validateAndGetEndTime({ service_id: 1, date: addDays(5), start_time: '09:00' }, conn),
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /no disponible/i);
        return true;
      }
    );
  });

  // La cita debe caer dentro del horario laboral del negocio
  test('lanza error si el horario cae fuera del horario laboral', async () => {
    const conn = createMockConn([
      [[{ duration: 30 }]],
      [[]],
      [[{ end_time: '09:30:00' }]],
      [[{ start_time: '10:00:00', end_time: '18:00:00' }]],
    ]);

    await assert.rejects(
      () => validateAndGetEndTime({ service_id: 1, date: addDays(5), start_time: '09:00' }, conn),
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /horario laboral/i);
        return true;
      }
    );
  });

  // Buffer de anticipación: Si la cita es para hoy, debe respetarse el buffer de anticipación
  test('lanza error si la reserva no respeta el buffer de anticipación', async () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 10 * 60000);
    const start_time = `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}`;
    const todayStr = now.toISOString().slice(0, 10);

    const conn = createMockConn([
      [[{ duration: 15 }]],
      [[]],
      [[{ end_time: '23:59:00' }]],
      [[{ start_time: '00:00:00', end_time: '23:59:00' }]],
    ]);

    await assert.rejects(
      () => validateAndGetEndTime({ service_id: 1, date: todayStr, start_time }, conn),
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /anticipación/i);
        return true;
      }
    );
  });

  // Traslape con otra cita
  test('lanza error si el horario ya está ocupado por otra cita', async () => {
    const conn = createMockConn([
      [[{ duration: 30 }]],
      [[]],
      [[{ end_time: '09:30:00' }]],
      [[{ start_time: '08:00:00', end_time: '18:00:00' }]],
      [[{ id: 42 }]],
    ]);

    await assert.rejects(
      () => validateAndGetEndTime({ service_id: 1, date: addDays(5), start_time: '09:00' }, conn),
      (err) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /ocupado/i);
        return true;
      }
    );
  });

  // Cuando todo es válido, debe devolver la hora de fin calculada correctamente
  test('resuelve con la hora de fin correcta cuando todo es válido', async () => {
    const conn = createMockConn([
      [[{ duration: 30 }]],
      [[]],
      [[{ end_time: '09:30:00' }]],
      [[{ start_time: '08:00:00', end_time: '18:00:00' }]],
      [[]],
    ]);

    const endTime = await validateAndGetEndTime(
      { service_id: 1, date: addDays(5), start_time: '09:00' },
      conn
    );

    assert.equal(endTime, '09:30:00');
  });

  // Al reprogramar, la cita propia debe excluirse de la validación de traslape
  test('excluye la propia cita de la validación de traslape al reprogramar', async () => {
    const conn = createMockConn([
      [[{ duration: 30 }]],
      [[]],
      [[{ end_time: '09:30:00' }]],
      [[{ start_time: '08:00:00', end_time: '18:00:00' }]],
      [[]],
    ]);

    await validateAndGetEndTime(
      { service_id: 1, date: addDays(5), start_time: '09:00', excludeAppointmentId: 7 },
      conn
    );

    const overlapCall = conn.calls[conn.calls.length - 1];
    assert.match(overlapCall.sql, /AND id != \?/);
    assert.equal(overlapCall.params[overlapCall.params.length - 1], 7);
  });
});