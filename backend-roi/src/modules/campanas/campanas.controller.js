import * as service from './campanas.service.js';

export const calcularPresupuesto = async (req, res) => {
    try {
        const { presupuesto_total, restricciones, id_usuario } = req.body;

        if (!presupuesto_total || isNaN(presupuesto_total) || presupuesto_total <= 0) {
            return res.status(400).json({ 
                error: "Por favor envía un presupuesto_total válido mayor a 0." 
            });
        }

        const resultado = await service.calcularPresupuestoSugerido(Number(presupuesto_total), restricciones, id_usuario);
        return res.status(200).json({
            mensaje: "Cálculo de presupuesto exitoso",
            datos: resultado
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const agregarHistorial = async (req, res) => {
    try {
        const datosNuevoMes = req.body;
        const resultado = await service.registrarNuevoMes(datosNuevoMes);
        return res.status(201).json(resultado);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};