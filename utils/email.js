import { Resend } from 'resend';
import { logger } from './logger.js';
import { formatDateLong, formatTime12h } from '../utils/time.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';
const APP_NAME = 'Gestor de Citas';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// Función centralizada para enviar correos con manejo de errores
const send = async (payload) => {
  try {
    await resend.emails.send(payload);
  } catch (err) {
    logger.error('[Email] Error al enviar correo:', err?.message || err);
  }
};

// Helpers para construir el HTML de los correos
const header = (subtitle = '') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr>
        <td align="center" style="background:#0f172a;padding:16px 28px;">
          <p style="margin:0;color:#ffffff;font-size:14px;font-weight:700;">${APP_NAME}${subtitle ? ` · ${subtitle}` : ''}</p>
        </td>
      </tr>
      <tr><td style="padding:24px 28px;">
`;

// Helpers para construir el Footer de los correos
const footer = () => `
      </td></tr>
      <tr>
        <td align="center" style="background:#f8fafc;padding:12px 28px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} ${APP_NAME}. Todos los derechos reservados.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

// Badge tipo pill para los estados de las citas
const pill = (emoji, text, bg, color) =>
  `<p style="margin:0 0 10px;"><span style="display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;background:${bg};color:${color};">${emoji} ${text}</span></p>`;

// Título y subtítulo alineados a la izquierda
const bodyHeader = (title, subtitle) => `
  <h2 style="margin:0 0 6px;font-size:17px;font-weight:700;color:#0f172a;text-align:left;">${title}</h2>
  <p style="margin:0 0 18px;font-size:13px;color:#475569;line-height:1.6;text-align:left;">${subtitle}</p>
`;

// Fila de dato en la tabla de detalles
const row = (label, value) => `
  <tr>
    <td style="padding:7px 14px;font-size:12px;color:#64748b;width:96px;border-bottom:1px solid #e2e8f0;">${label}</td>
    <td style="padding:7px 14px;font-size:12px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${value}</td>
  </tr>`;

// Tabla de detalles de cita
const appointmentRows = ({ serviceName, date, startTime, endTime }) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;border-collapse:collapse;margin:0 0 16px;overflow:hidden;">
    ${row('Servicio', serviceName)}
    ${row('Fecha', formatDateLong(date))}
    ${row('Hora', `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`)}
  </table>`;

// Tabla de detalles para citas reprogramadas
const rescheduleRows = ({ serviceName, date, startTime, endTime }) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;border-collapse:collapse;margin:0 0 16px;overflow:hidden;">
    ${row('Servicio', serviceName)}
    ${row('Nueva fecha', formatDateLong(date))}
    ${row('Nueva hora', `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`)}
  </table>`;

// Tabla de detalles para el admin
const adminRows = ({ clientName, clientEmail, serviceName, date, startTime, endTime }) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;border-collapse:collapse;margin:0 0 16px;overflow:hidden;">
    ${row('Cliente', clientName)}
    ${row('Correo', clientEmail)}
    ${row('Servicio', serviceName)}
    ${row('Fecha', formatDateLong(date))}
    ${row('Hora', `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`)}
  </table>`;

// Nota al pie del body
const note = (text) =>
  `<p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;text-align:left;">${text}</p>`;

// Cita creada por el cliente
export const sendAppointmentCreatedClient = async (to, { clientName, serviceName, date, startTime, endTime }) => {
  await send({
    from: FROM,
    to,
    subject: `Tu cita ha sido agendada — ${APP_NAME}`,
    html: `${header()}
      ${pill('🗓️', 'Cita agendada', '#dcfce7', '#166534')}
      ${bodyHeader('¡Tu cita está registrada!', `Hola ${clientName}, tu cita ha sido registrada correctamente. Aquí tienes los detalles:`)}
      ${appointmentRows({ serviceName, date, startTime, endTime })}
      ${note('Puedes cancelar o reprogramar tu cita con al menos <strong>12 horas de anticipación</strong> desde tu cuenta.')}
    ${footer()}`,
  });
};

// Cita cancelada por el cliente o por el admin
export const sendAppointmentCancelledClient = async (to, { clientName, serviceName, date, startTime, endTime, cancelledByAdmin }) => {
  await send({
    from: FROM,
    to,
    subject: `Tu cita ha sido cancelada — ${APP_NAME}`,
    html: `${header()}
      ${pill('❌', 'Cita cancelada', '#fee2e2', '#991b1b')}
      ${bodyHeader(
        'Tu cita ha sido cancelada',
        cancelledByAdmin
          ? `Hola ${clientName}, tu cita ha sido cancelada por el equipo. Si tienes dudas, contáctanos.`
          : `Hola ${clientName}, tu solicitud de cancelación fue procesada correctamente.`
      )}
      ${appointmentRows({ serviceName, date, startTime, endTime })}
      ${note('Puedes agendar una nueva cita cuando gustes desde tu cuenta.')}
    ${footer()}`,
  });
};

// Cita reprogramada por el cliente
export const sendAppointmentRescheduledClient = async (to, { clientName, serviceName, date, startTime, endTime }) => {
  await send({
    from: FROM,
    to,
    subject: `Tu cita ha sido reprogramada — ${APP_NAME}`,
    html: `${header()}
      ${pill('🔄', 'Cita reprogramada', '#dbeafe', '#1d4ed8')}
      ${bodyHeader('Tu cita fue reprogramada', `Hola ${clientName}, tu cita ha sido reprogramada. Aquí están los nuevos detalles:`)}
      ${rescheduleRows({ serviceName, date, startTime, endTime })}
      ${note('Si necesitas otro cambio, recuerda hacerlo con al menos <strong>12 horas de anticipación</strong>.')}
    ${footer()}`,
  });
};

// Estado cambiado a CONFIRMED
export const sendAppointmentConfirmedClient = async (to, { clientName, serviceName, date, startTime, endTime }) => {
  await send({
    from: FROM,
    to,
    subject: `Tu cita ha sido confirmada — ${APP_NAME}`,
    html: `${header()}
      ${pill('✅', 'Cita confirmada', '#dcfce7', '#166534')}
      ${bodyHeader('¡Tu cita está confirmada!', `Hola ${clientName}, el equipo ha confirmado tu cita. ¡Te esperamos!`)}
      ${appointmentRows({ serviceName, date, startTime, endTime })}
      ${note('Si necesitas cancelar o reprogramar, recuerda hacerlo con al menos <strong>12 horas de anticipación</strong>.')}
    ${footer()}`,
  });
};

// Estado cambiado a COMPLETED
export const sendAppointmentCompletedClient = async (to, { clientName, serviceName, date, startTime, endTime }) => {
  await send({
    from: FROM,
    to,
    subject: `Gracias por tu visita — ${APP_NAME}`,
    html: `${header()}
      ${pill('⭐', 'Cita completada', '#e0e7ff', '#3730a3')}
      ${bodyHeader(`¡Gracias por tu visita, ${clientName}!`, 'Tu cita ha sido marcada como completada. Esperamos haberte atendido de la mejor manera.')}
      ${appointmentRows({ serviceName, date, startTime, endTime })}
      ${note('Cuando quieras volver, estaremos encantados de atenderte. ¡Hasta pronto!')}
    ${footer()}`,
  });
};

// Nueva cita creada por un cliente
export const sendAppointmentCreatedAdmin = async ({ clientName, clientEmail, serviceName, date, startTime, endTime }) => {
  if (!ADMIN_EMAIL) return;
  await send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Nueva cita agendada — ${APP_NAME}`,
    html: `${header('Panel admin')}
      ${pill('🔔', 'Nueva reserva', '#dcfce7', '#166534')}
      ${bodyHeader('Nueva cita recibida', 'Un cliente acaba de agendar una cita en tu negocio.')}
      ${adminRows({ clientName, clientEmail, serviceName, date, startTime, endTime })}
      ${note('Puedes confirmar o gestionar esta cita desde el panel de administración.')}
    ${footer()}`,
  });
};

// Cita cancelada por un cliente
export const sendAppointmentCancelledAdmin = async ({ clientName, clientEmail, serviceName, date, startTime, endTime }) => {
  if (!ADMIN_EMAIL) return;
  await send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Cita cancelada por el cliente — ${APP_NAME}`,
    html: `${header('Panel admin')}
      ${pill('❌', 'Cita cancelada', '#fee2e2', '#991b1b')}
      ${bodyHeader('Un cliente canceló su cita', 'El siguiente cliente ha cancelado su cita. El horario quedó disponible.')}
      ${adminRows({ clientName, clientEmail, serviceName, date, startTime, endTime })}
      ${note('Puedes gestionar el horario disponible desde el panel de administración.')}
    ${footer()}`,
  });
};

// Restablecimiento de contraseña
export const sendPasswordResetEmail = async (to, resetUrl) => {
  await send({
    from: FROM,
    to,
    subject: `Restablecer contraseña — ${APP_NAME}`,
    html: `${header()}
      ${pill('🔑', 'Seguridad de cuenta', '#f1f5f9', '#475569')}
      ${bodyHeader('Restablecer contraseña', 'Recibimos una solicitud para restablecer la contraseña de tu cuenta. El enlace expirará en <strong>10 minutos</strong>.')}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td align="center">
            <a href="${resetUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 24px;border-radius:8px;">
              Restablecer contraseña
            </a>
          </td>
        </tr>
      </table>
      ${note(`Si no puedes hacer clic en el botón, copia este enlace en tu navegador:<br/><span style="color:#3b82f6;word-break:break-all;">${resetUrl}</span>`)}
      <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;text-align:left;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
    ${footer()}`,
  });
};