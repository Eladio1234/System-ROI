import express from 'express';
import * as controller from './campanas.controller.js';

const router = express.Router();

router.post('/calcular', controller.calcularPresupuesto);
router.post('/historial', controller.agregarHistorial);

export default router;