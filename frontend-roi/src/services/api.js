const API_URL = 'http://localhost:3000/api/campanas';

export const calcularPresupuesto = async (datosPeticion) => {
    try {
        const respuesta = await fetch(`${API_URL}/calcular`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosPeticion)
        });

        if (!respuesta.ok) {
            const error = await respuesta.json();
            throw new Error(error.error || 'Error al conectar con el servidor');
        }

        const data = await respuesta.json();
        return data.datos; 
    } catch (error) {
        console.error("Error en la petición:", error);
        throw error;
    }
};

export const guardarNuevoMes = async (datosMes) => {
    try {
        const respuesta = await fetch(`${API_URL}/historial`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosMes)
        });

        if (!respuesta.ok) {
            const error = await respuesta.json();
            throw new Error(error.error || 'Error al guardar el historial');
        }

        return await respuesta.json(); 
    } catch (error) {
        console.error("Error al guardar:", error);
        throw error;
    }
};