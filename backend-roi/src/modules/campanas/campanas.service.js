import * as repository from './campanas.repository.js';

export const calcularPresupuestoSugerido = async (presupuestoTotal, restricciones = {}, idUsuario = null) => {
    const minRedes = Number(restricciones.minRedes) || 0;
    const minTele = Number(restricciones.minTele) || 0;
    const minRadio = Number(restricciones.minRadio) || 0;
    
    if ((minRedes + minTele + minRadio) > 100) {
        throw new Error("La suma de las restricciones mínimas no puede superar el 100%.");
    }

    const historial = await repository.obtenerHistorial();

    let invRedes = 0, ganRedes = 0;
    let invTele = 0, ganTele = 0;
    let invRadio = 0, ganRadio = 0;

    historial.forEach(registro => {
        const nombreCanal = registro.canales_marketing.nombre_canal;
        const inversion = Number(registro.inversion);
        const ganancia = Number(registro.ganancia);

        if (nombreCanal === 'Redes Sociales') {
            invRedes += inversion; ganRedes += ganancia;
        } else if (nombreCanal === 'Televisión') {
            invTele += inversion; ganTele += ganancia;
        } else if (nombreCanal === 'Radio') {
            invRadio += inversion; ganRadio += ganancia;
        }
    });

    let roiRedes = Math.max(0, invRedes > 0 ? (ganRedes - invRedes) / invRedes : 0);
    let roiTele = Math.max(0, invTele > 0 ? (ganTele - invTele) / invTele : 0);
    let roiRadio = Math.max(0, invRadio > 0 ? (ganRadio - invRadio) / invRadio : 0);

    const sumaPuntos = roiRedes + roiTele + roiRadio;

    if (sumaPuntos === 0) {
        throw new Error("Todos los canales tienen ROI negativo. No se recomienda invertir.");
    }

    const canales = ['redes', 'tele', 'radio'];
    const roi = { redes: roiRedes, tele: roiTele, radio: roiRadio };
    
    let asignacion = {
        redes: (roi.redes / sumaPuntos) * presupuestoTotal,
        tele: (roi.tele / sumaPuntos) * presupuestoTotal,
        radio: (roi.radio / sumaPuntos) * presupuestoTotal
    };

    const minReq = { 
        redes: (minRedes / 100) * presupuestoTotal, 
        tele: (minTele / 100) * presupuestoTotal, 
        radio: (minRadio / 100) * presupuestoTotal 
    };

    let deficit = 0;
    let ajustado = { redes: false, tele: false, radio: false };

    canales.forEach(c => {
        if (asignacion[c] < minReq[c]) {
            deficit += (minReq[c] - asignacion[c]); 
            asignacion[c] = minReq[c]; 
            ajustado[c] = true; 
        }
    });

    if (deficit > 0) {
        const canalesDonadores = canales.filter(c => !ajustado[c]);
        const sumaRoiDonadores = canalesDonadores.reduce((sum, c) => sum + roi[c], 0);

        canalesDonadores.forEach(c => {
            let proporcion = sumaRoiDonadores > 0 ? (roi[c] / sumaRoiDonadores) : (1 / canalesDonadores.length);
            asignacion[c] -= (deficit * proporcion);
            
            if (asignacion[c] < minReq[c]) {
                asignacion[c] = minReq[c]; 
            }
        });
    }

    const usuarioActivo = idUsuario || '4fab96eb-deae-4f51-ac2a-c25321aa3be6'; 
    await repository.guardarSimulacion(usuarioActivo, presupuestoTotal);

    return {
        analisis_roi: {
            redes: Number(roiRedes.toFixed(4)),
            tele: Number(roiTele.toFixed(4)),
            radio: Number(roiRadio.toFixed(4))
        },
        presupuesto_sugerido: {
            redes: Number(asignacion.redes.toFixed(2)),
            tele: Number(asignacion.tele.toFixed(2)),
            radio: Number(asignacion.radio.toFixed(2))
        }
    };
};

export const registrarNuevoMes = async (datos) => {
    if (!datos.fecha_registro) {
        throw new Error("La fecha de registro es obligatoria.");
    }

    const nuevaCampana = {
        nombre_campana: datos.nombre_campana || `Campaña - ${datos.fecha_registro}`,
        fecha_inicio: datos.fecha_registro,
        estado: 'Completada'
    };

    const rendimientos = [
        { id_canal: 1, inversion: Number(datos.inversion_redes) || 0, ganancia: Number(datos.ganancia_redes) || 0 },
        { id_canal: 2, inversion: Number(datos.inversion_tele) || 0, ganancia: Number(datos.ganancia_tele) || 0 },
        { id_canal: 3, inversion: Number(datos.inversion_radio) || 0, ganancia: Number(datos.ganancia_radio) || 0 }
    ];

    await repository.guardarHistorial(nuevaCampana, rendimientos);
    
    return { mensaje: "Los datos han sido guardados" };
};