import supabase from '../../config/supabase.js';

export const obtenerHistorial = async () => {
    const { data, error } = await supabase
        .from('rendimiento_canales')
        .select(`
            inversion,
            ganancia,
            canales_marketing (nombre_canal)
        `);
    
    if (error) throw new Error('Error al obtener datos: ' + error.message);
    return data;
};

export const guardarHistorial = async (nuevaCampana, rendimientos) => {
    const { data: campanaData, error: campanaError } = await supabase
        .from('campanas')
        .insert([nuevaCampana])
        .select()
        .single();
        
    if (campanaError) throw new Error('Error al guardar campaña: ' + campanaError.message);

    const rendimientosConId = rendimientos.map(r => ({
        ...r,
        id_campana: campanaData.id
    }));

    const { error: rendError } = await supabase
        .from('rendimiento_canales')
        .insert(rendimientosConId);
        
    if (rendError) throw new Error('Error al guardar rendimientos: ' + rendError.message);
    
    return true;
};

export const guardarSimulacion = async (idUsuario, presupuesto) => {
    const { error } = await supabase
        .from('historial_simulaciones')
        .insert([{
            id_usuario: idUsuario,
            presupuesto_ingresado: presupuesto
        }]);
        
    if (error) throw new Error('Error al registrar la simulación: ' + error.message);
    return true;
};