import * as appointmentService from '../services/appointments.js';

// Crear cita
export const create = async (req, res) => {
  try {
    const result = await appointmentService.create(req.user.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

// Obtener citas del usuario
export const getMyAppointments = async (req, res) => {
  try {
    const { start, end } = req.query;
    const result = await appointmentService.getByUser(req.user.id, start, end);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ 
      success: false, 
      message: error.message || 'Error interno del servidor' 
    });
  }
};

// Obtener una cita específica por ID (CLIENT)
export const getById = async (req, res) => {
  try {
    const result = await appointmentService.getById(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ 
      success: false, 
      message: error.message || 'Error interno del servidor' 
    });
  }
};

// Obtener todas las citas (ADMIN)
export const getAll = async (req, res) => {
  try {
    const result = await appointmentService.getAll();
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

// Obtener agenda diaria por fecha (ADMIN)
export const getByDay=async(req,res)=>{
  try{
    const{date}=req.query
    if(!date)
      return res.status(400).json({
      success:false,
      message:'La fecha es obligatoria'
    })

   if(!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res.status(400).json({
     success:false,
     message:'Formato de fecha inválido'
    })

   const result=await appointmentService.getByDay(date)
   res.json(result)
    }catch(error){
   res.status(error.status||500).json({ success:false, message:error.message||'Error interno del servidor'});
  }
};

// Cancelar cita (CLIENT)
export const cancel = async (req, res) => {
  try {
    const result = await appointmentService.cancel(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

// Reprogramar cita (CLIENT)
export const reschedule = async (req, res) => {
  try {
    const result = await appointmentService.reschedule(req.params.id, req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

// Cambiar estado de cita (ADMIN)
export const updateStatus = async (req, res) => {
  try {
    const result = await appointmentService.updateStatus(req.params.id, req.body.status);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

// Obtener horarios disponibles (PUBLIC)
export const getAvailableSlots = async (req, res) => {
  try {
    const { service_id, date } = req.query;
    const result = await appointmentService.getAvailableSlots(service_id, date);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};