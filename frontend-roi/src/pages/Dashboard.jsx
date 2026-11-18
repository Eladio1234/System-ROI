import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { calcularPresupuesto, guardarNuevoMes } from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as TooltipBar, ResponsiveContainer, 
  PieChart, Pie, Cell, Tooltip as TooltipPie, Legend 
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../App.css';

const COLORES = ['#3b82f6', '#10b981', '#ef4444']; 

export default function Dashboard() {
  const navigate = useNavigate();
  
  const [vistaActiva, setVistaActiva] = useState('calcular'); 
  const [presupuesto, setPresupuesto] = useState('');
  
  const [restricciones, setRestricciones] = useState({
    minRedes: 0,
    minTele: 0,
    minRadio: 0
  });

  const [resultados, setResultados] = useState(null);
  const [formularioHistorial, setFormularioHistorial] = useState({
    nombre_campana: '', fecha_registro: '',
    inversion_redes: '', ganancia_redes: '',
    inversion_tele: '', ganancia_tele: '',
    inversion_radio: '', ganancia_radio: ''
  });

  const [loading, setLoading] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const manejarRango = (e) => {
    setRestricciones({
      ...restricciones,
      [e.target.name]: Number(e.target.value)
    });
  };

  const manejarCalculo = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setMensajeExito(null);
    try {
      const datos = await calcularPresupuesto({ 
        presupuesto_total: presupuesto, 
        restricciones: restricciones 
      });
      setResultados(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cambiarInputHistorial = (e) => {
    setFormularioHistorial({
      ...formularioHistorial,
      [e.target.name]: e.target.value
    });
  };

  const manejarGuardadoHistorial = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setMensajeExito(null);
    try {
      const res = await guardarNuevoMes(formularioHistorial);
      setMensajeExito(res.mensaje);
      setFormularioHistorial({
        fecha_registro: '', inversion_redes: '', ganancia_redes: '',
        inversion_tele: '', ganancia_tele: '', inversion_radio: '', ganancia_radio: '', nombre_campana: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  let datosROI = [];
  let datosPresupuesto = [];
  let gananciaEst = 0;
  let roiOptimizado = '--';

  if (resultados) {
    gananciaEst = (resultados.presupuesto_sugerido.redes * resultados.analisis_roi.redes) + 
                  (resultados.presupuesto_sugerido.tele * resultados.analisis_roi.tele) + 
                  (resultados.presupuesto_sugerido.radio * resultados.analisis_roi.radio);
    
    roiOptimizado = presupuesto > 0 ? ((gananciaEst / Number(presupuesto)) * 100).toFixed(2) : '0.00';

    datosROI = [
      { canal: 'Redes', roi: resultados.analisis_roi.redes * 100 },
      { canal: 'TV', roi: resultados.analisis_roi.tele * 100 },
      { canal: 'Radio', roi: resultados.analisis_roi.radio * 100 }
    ];
    
    datosPresupuesto = [
      { canal: 'Redes Sociales', valor: resultados.presupuesto_sugerido.redes },
      { canal: 'Televisión', valor: resultados.presupuesto_sugerido.tele },
      { canal: 'Radio', valor: resultados.presupuesto_sugerido.radio }
    ].filter(item => item.valor > 0);
  }

  const exportarPDF = async () => {
    setGenerandoPDF(true);
    try {
      const elemento = document.getElementById('reporte-pdf');
      const btnContainer = document.getElementById('contenedor-btn-exportar');
      
      if (btnContainer) btnContainer.style.display = 'none';
      
      const canvas = await html2canvas(elemento, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      if (btnContainer) btnContainer.style.display = 'flex';

      const doc = new jsPDF('p', 'mm', 'a4');
      const margen = 14;
      
      doc.setFontSize(18);
      doc.setTextColor(31, 41, 55);
      doc.text("Reporte Ejecutivo: Distribucion de Presupuesto (DSS)", margen, 20);

      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      doc.text(`Fecha de generacion: ${new Date().toLocaleDateString('es-MX')}`, margen, 28);
      
      const pdfWidth = doc.internal.pageSize.getWidth() - (margen * 2);
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      doc.addImage(imgData, 'PNG', margen, 35, pdfWidth, pdfHeight);

      const porcentajeRedes = ((resultados.presupuesto_sugerido.redes / presupuesto) * 100).toFixed(2);
      const porcentajeTele = ((resultados.presupuesto_sugerido.tele / presupuesto) * 100).toFixed(2);
      const porcentajeRadio = ((resultados.presupuesto_sugerido.radio / presupuesto) * 100).toFixed(2);

      const tablaDatos = [
        ['Redes Sociales', `$${resultados.presupuesto_sugerido.redes.toLocaleString()}`, `${porcentajeRedes}%`, `${(resultados.analisis_roi.redes * 100).toFixed(1)}%`],
        ['Television', `$${resultados.presupuesto_sugerido.tele.toLocaleString()}`, `${porcentajeTele}%`, `${(resultados.analisis_roi.tele * 100).toFixed(1)}%`],
        ['Radio', `$${resultados.presupuesto_sugerido.radio.toLocaleString()}`, `${porcentajeRadio}%`, `${(resultados.analisis_roi.radio * 100).toFixed(1)}%`]
      ];

      autoTable(doc, {
        startY: 35 + pdfHeight + 10,
        head: [['Canal de Marketing', 'Presupuesto Asignado', '% del Total', 'ROI Historico']],
        body: tablaDatos,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10, cellPadding: 5 }
      });

      const posYFinal = doc.lastAutoTable.finalY + 15;
      
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text(`Ganancia Proyectada Estimada: $${gananciaEst.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (ROI Optimizado: ${roiOptimizado}%)`, margen, posYFinal);

      doc.save(`Reporte_ROI_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Error al exportar PDF:", err);
      setError("Hubo un problema al generar el documento.");
    } finally {
      setGenerandoPDF(false);
    }
  };

  const fechaActual = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="layout-dashboard">
      <aside className="sidebar">
        <div>
          <div className="sidebar-header">
            SISTEMA ROI
          </div>
          <div className="sidebar-menu">
            <button className={`menu-btn ${vistaActiva === 'calcular' ? 'activo' : ''}`} onClick={() => { setVistaActiva('calcular'); setError(null); setMensajeExito(null); }}>
              Calculadora ROI
            </button>
            <button className={`menu-btn ${vistaActiva === 'historial' ? 'activo' : ''}`} onClick={() => { setVistaActiva('historial'); setError(null); setMensajeExito(null); }}>
              Historial de Datos
            </button>
          </div>
        </div>
        <div className="sidebar-footer">
          <div className="perfil-usuario" style={{marginBottom: '15px'}}>
            <strong>Usuario Activo</strong>
            <br /><span>(Rol: Administrador)</span>
          </div>
          <button 
            onClick={cerrarSesion} 
            className="btn-secundario" 
            style={{width: '100%', justifyContent: 'center', backgroundColor: 'transparent', color: '#ef4444', borderColor: '#ef4444'}}
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="contenido-principal">
        <header className="header-principal">
          <h1>Asignador de Presupuesto de Publicidad</h1>
          <span style={{color: '#6b7280'}}>{fechaActual}</span>
        </header>

        {error && <div style={{padding: '15px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px'}}>{error}</div>}
        {mensajeExito && <div style={{padding: '15px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '8px', marginBottom: '20px'}}>{mensajeExito}</div>}

        {vistaActiva === 'calcular' && (
          <div id="reporte-pdf" style={{ padding: '10px', backgroundColor: 'var(--bg-principal)' }}>
            <div className="resumen-grid">
              <div className="tarjeta-resumen azul">
                <h3>Presupuesto Ingresado</h3>
                <p>${Number(presupuesto || 0).toLocaleString()}</p>
              </div>
              <div className="tarjeta-resumen verde">
                <h3>ROI Optimizado</h3>
                <p>
                  {resultados ? `${roiOptimizado}%` : '--%'}
                </p>
              </div>
              <div className="tarjeta-resumen verde">
                <h3>Ganancia Proyectada</h3>
                <p>
                  {resultados ? `$${gananciaEst.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0'}
                </p>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="tarjeta">
                <h2>Nueva Simulación</h2>
                <form onSubmit={manejarCalculo}>
                  <div className="form-group">
                    <label>Monto a Invertir ($)</label>
                    <input 
                      type="number" 
                      className="input-monto"
                      placeholder="Ej. 100000" 
                      value={presupuesto}
                      onChange={(e) => setPresupuesto(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{marginTop: '30px', marginBottom: '20px'}}>
                    <h3 style={{fontSize: '1rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px'}}>Restricciones Mínimas</h3>
                    
                    <div className="rango-control">
                      <div className="rango-etiqueta"><span>Mínimo Redes (%)</span><span>{restricciones.minRedes}%</span></div>
                      <input type="range" name="minRedes" className="input-rango" min="0" max="100" value={restricciones.minRedes} onChange={manejarRango} />
                    </div>
                    
                    <div className="rango-control">
                      <div className="rango-etiqueta"><span>Mínimo TV (%)</span><span>{restricciones.minTele}%</span></div>
                      <input type="range" name="minTele" className="input-rango" min="0" max="100" value={restricciones.minTele} onChange={manejarRango} />
                    </div>

                    <div className="rango-control">
                      <div className="rango-etiqueta"><span>Mínimo Radio (%)</span><span>{restricciones.minRadio}%</span></div>
                      <input type="range" name="minRadio" className="input-rango" min="0" max="100" value={restricciones.minRadio} onChange={manejarRango} />
                    </div>
                  </div>

                  <button type="submit" className="btn-principal" disabled={loading}>
                    {loading ? 'Calculando...' : 'Calcular Distribución Óptima'}
                  </button>
                </form>
              </div>

              <div className="tarjeta">
                <h2>Distribución Sugerida ($)</h2>
                {resultados ? (
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={datosPresupuesto} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="valor" nameKey="canal">
                          {datosPresupuesto.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                          ))}
                        </Pie>
                        <TooltipPie formatter={(value) => `$${value.toLocaleString()}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    <div id="contenedor-btn-exportar" className="acciones-resultados">
                      <button onClick={exportarPDF} className="btn-secundario" disabled={generandoPDF}>
                        {generandoPDF ? 'Generando...' : '📄 Exportar PDF'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#9ca3af'}}>
                    Ingresa un presupuesto para ver la distribución.
                  </div>
                )}
              </div>

              <div className="tarjeta">
                <h2>Análisis ROI por Canal (%)</h2>
                {resultados ? (
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={datosROI} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <XAxis dataKey="canal" />
                        <YAxis />
                        <TooltipBar cursor={{fill: '#f1f5f9'}} />
                        <Bar dataKey="roi" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#9ca3af'}}>
                    Esperando datos de simulación...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {vistaActiva === 'historial' && (
          <div className="tarjeta" style={{maxWidth: '900px', margin: '0 auto'}}>
            <h2>Registrar Datos Históricos de Campaña</h2>
            <form onSubmit={manejarGuardadoHistorial}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Nombre de la Campaña:</label>
                  <input type="text" className="input-monto" name="nombre_campana" placeholder="Ej. Venta de Verano 2026" value={formularioHistorial.nombre_campana} onChange={cambiarInputHistorial} required />
                </div>
                <div className="form-group">
                  <label>Fecha de la Campaña:</label>
                  <input type="date" className="input-monto" name="fecha_registro" value={formularioHistorial.fecha_registro} onChange={cambiarInputHistorial} required />
                </div>
              </div>

              <h3 style={{ fontSize: '1.1rem', color: '#4b5563', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginTop: '20px', marginBottom: '20px' }}>
                Rendimiento por Canal de Marketing
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <div className="tarjeta-interior">
                  <h4 style={{marginTop: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px'}}>Redes Sociales</h4>
                  <div className="form-group"><label style={{fontSize: '0.9rem'}}>Inversión ($)</label><input type="number" className="input-monto" name="inversion_redes" value={formularioHistorial.inversion_redes} onChange={cambiarInputHistorial} required /></div>
                  <div className="form-group" style={{marginBottom: 0}}><label style={{fontSize: '0.9rem'}}>Ganancia ($)</label><input type="number" className="input-monto" name="ganancia_redes" value={formularioHistorial.ganancia_redes} onChange={cambiarInputHistorial} required /></div>
                </div>

                <div className="tarjeta-interior">
                  <h4 style={{marginTop: 0, color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px'}}>Televisión</h4>
                  <div className="form-group"><label style={{fontSize: '0.9rem'}}>Inversión ($)</label><input type="number" className="input-monto" name="inversion_tele" value={formularioHistorial.inversion_tele} onChange={cambiarInputHistorial} required /></div>
                  <div className="form-group" style={{marginBottom: 0}}><label style={{fontSize: '0.9rem'}}>Ganancia ($)</label><input type="number" className="input-monto" name="ganancia_tele" value={formularioHistorial.ganancia_tele} onChange={cambiarInputHistorial} required /></div>
                </div>

                <div className="tarjeta-interior">
                  <h4 style={{marginTop: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px'}}>Radio</h4>
                  <div className="form-group"><label style={{fontSize: '0.9rem'}}>Inversión ($)</label><input type="number" className="input-monto" name="inversion_radio" value={formularioHistorial.inversion_radio} onChange={cambiarInputHistorial} required /></div>
                  <div className="form-group" style={{marginBottom: 0}}><label style={{fontSize: '0.9rem'}}>Ganancia ($)</label><input type="number" className="input-monto" name="ganancia_radio" value={formularioHistorial.ganancia_radio} onChange={cambiarInputHistorial} required /></div>
                </div>
              </div>

              <button type="submit" className="btn-principal" disabled={loading}>
                {loading ? 'Guardando en Base de Datos...' : 'Guardar Datos Históricos'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}