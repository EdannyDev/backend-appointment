// Script de prueba manual para verificar el fix de condición de carrera.
const BASE_URL = 'http://localhost:5000/api/v2';
const CLIENT_EMAIL = 'tu_cliente_de_prueba@correo.com';
const CLIENT_PASSWORD = 'TuPassword123!';

const SERVICE_A_ID = 1;
const SERVICE_B_ID = 2;

const TEST_DATE = '2026-07-20';
const START_TIME_A = '10:00';
const START_TIME_B = '10:15';

const extractCookie = (res) => {
  const raw = res.headers.get('set-cookie');
  if (!raw) throw new Error('No se recibió cookie de sesión. ¿Login falló?');
  return raw.split(';')[0];
};

const login = async () => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CLIENT_EMAIL, password: CLIENT_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login falló: ${res.status}`);
  return extractCookie(res);
};

const bookAppointment = async (cookie, service_id, start_time) => {
  const res = await fetch(`${BASE_URL}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ service_id, date: TEST_DATE, start_time }),
  });
  const data = await res.json();
  return { status: res.status, data };
};

const run = async () => {
  console.log('Iniciando sesión...');
  const cookie = await login();

  console.log('Disparando 2 reservas simultáneas que se traslapan...');
  const [resultA, resultB] = await Promise.all([
    bookAppointment(cookie, SERVICE_A_ID, START_TIME_A),
    bookAppointment(cookie, SERVICE_B_ID, START_TIME_B),
  ]);

  console.log('\n--- Resultado A ---');
  console.log(resultA.status, resultA.data);
  console.log('\n--- Resultado B ---');
  console.log(resultB.status, resultB.data);

  const successCount = [resultA, resultB].filter((r) => r.status === 201).length;

  console.log('\n=== VEREDICTO ===');
  if (successCount === 1) {
    console.log('CORRECTO: solo una de las dos reservas se creó. El lock funcionó.');
  } else if (successCount === 2) {
    console.log('BUG: ambas reservas se crearon. Hay doble-booking traslapado.');
  } else {
    console.log('Ninguna se creó — revisa los datos de prueba (servicios, horario laboral, fecha).');
  }
};

run().catch((err) => console.error('Error en el script:', err.message));