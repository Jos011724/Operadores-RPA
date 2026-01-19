import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import API_URL from './api'; 

function Dashboard({ token }) {
  const [rol, setRol] = useState('');
  const [datosUsuario, setDatosUsuario] = useState({ run: '', nombre: '', apellido: '' });
  
  const [activeTab, setActiveTab] = useState('inicio'); 
  const [dronEnTurno, setDronEnTurno] = useState(null); 
  const [baseEnTurno, setBaseEnTurno] = useState('');

  const [drones, setDrones] = useState([]);
  const [baterias, setBaterias] = useState([]);
  const [vuelos, setVuelos] = useState([]);
  const [users, setUsers] = useState([]);

  const [formVuelo, setFormVuelo] = useState({
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '', hora_fin: '', predio: '', coordenadas: '', observacion: ''
  });
  const [duracionCalc, setDuracionCalc] = useState(0);
  
  const [formParBaterias, setFormParBaterias] = useState({ id_bat1: '', ciclos1: '', id_bat2: '', ciclos2: '', observacion: '' });

  const [newUser, setNewUser] = useState({ run: '', nombre: '', apellido: '', password: '', rol: 'operador' });
  const [newDrone, setNewDrone] = useState({ matricula: '', modelo: '' });
  const [newBattery, setNewBattery] = useState({ serial: '', equipo_id: '' });

  const [mensaje, setMensaje] = useState('');
  const [mostrarModalBitacora, setMostrarModalBitacora] = useState(false);

  const config = { headers: { Authorization: `Bearer ${token}` } };
  const opcionesBase = ["Villa San Antonio", "San Oscar", "Chanquin", "Nueva Imperial", "Base Central"];

  useEffect(() => {
    if (token) {
      const decoded = jwtDecode(token);
      setRol(decoded.rol);
      setDatosUsuario({ run: decoded.run, id: decoded.id, nombre: decoded.nombre || 'Usuario', apellido: decoded.apellido || '' });
      if (decoded.rol === 'admin') setActiveTab('admin_users');
    }
    cargarDatosGenerales();
    if (jwtDecode(token).rol === 'operador') {
        verificarTurnoActivo();
    }
  }, [token]);

  useEffect(() => {
    if (formVuelo.hora_inicio && formVuelo.hora_fin) {
      const [h1, m1] = formVuelo.hora_inicio.split(':').map(Number);
      const [h2, m2] = formVuelo.hora_fin.split(':').map(Number);
      const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      setDuracionCalc(diff > 0 ? diff : 0);
    }
  }, [formVuelo.hora_inicio, formVuelo.hora_fin]);

  const verificarTurnoActivo = async () => {
      try {
          const res = await axios.get(`${API_URL}/api/users/me`, config);
          if (res.data.dron_actual) {
              setDronEnTurno(res.data.dron_actual);
              setBaseEnTurno(res.data.base_actual);
              setActiveTab('bitacora'); // Si tiene turno, mandarlo directo a bitácora
          } else {
              setActiveTab('inicio_turno');
          }
      } catch (error) {
          console.error("Error verificando turno");
      }
  };

  const cargarDatosGenerales = async () => {
    try {
      const resDrones = await axios.get(`${API_URL}/api/drones`, config);
      setDrones(resDrones.data);
      const resBat = await axios.get(`${API_URL}/api/baterias`, config);
      setBaterias(resBat.data);
      const resVuelos = await axios.get(`${API_URL}/api/vuelos`, config);
      setVuelos(resVuelos.data);
      
      const decoded = jwtDecode(token);
      if (decoded.rol === 'admin') {
        const resUsers = await axios.get(`${API_URL}/api/users`, config);
        setUsers(resUsers.data);
      }
    } catch (e) { console.error("Error datos"); }
  };

  const iniciarTurno = async (dron, base) => {
    if (!dron || !base) return alert("Faltan datos");
    try {
        await axios.put(`${API_URL}/api/users/turno`, { dron_id: dron._id, base: base }, config);
        setDronEnTurno(dron);
        setBaseEnTurno(base);
        setActiveTab('bitacora');
        setMensaje("✅ Turno iniciado y sincronizado en la nube");
    } catch (error) {
        alert("Error al iniciar turno en el servidor");
    }
  };

  const liberarDronTurno = async () => {
    if(window.confirm("¿CONFIRMAR FIN DE TURNO?\nSe liberará el equipo asignado en todos tus dispositivos.")) {
        try {
            await axios.put(`${API_URL}/api/users/turno`, { dron_id: null, base: '' }, config);
            setDronEnTurno(null);
            setBaseEnTurno('');
            setActiveTab('inicio_turno');
        } catch (error) {
            alert("Error al finalizar turno");
        }
    }
  };

  const handleLogout = () => { localStorage.removeItem('token'); window.location.reload(); };

  const handleVueloSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/vuelos`, { ...formVuelo, duracion_min: duracionCalc, equipo_id: dronEnTurno._id, base: baseEnTurno }, config);
      setMensaje('✅ Vuelo guardado correctamente'); cargarDatosGenerales(); setMostrarModalBitacora(true);
      setFormVuelo({...formVuelo, observacion: '', predio: '', coordenadas: ''}); 
    } catch (e) { setMensaje(`❌ Error: ${e.response?.data?.error}`); }
  };

  const handleUpdatePar = async (e) => {
      e.preventDefault();
      const { id_bat1, ciclos1, id_bat2, ciclos2, observacion } = formParBaterias;
      try {
          await axios.put(`${API_URL}/api/baterias/ciclos/${id_bat1}`, { nuevos_ciclos: ciclos1, observacion }, config);
          if (id_bat2 && ciclos2) await axios.put(`${API_URL}/api/baterias/ciclos/${id_bat2}`, { nuevos_ciclos: ciclos2, observacion }, config);
          setMensaje("✅ Ciclos actualizados"); setFormParBaterias({ id_bat1: '', ciclos1: '', id_bat2: '', ciclos2: '', observacion: '' }); cargarDatosGenerales();
      } catch (error) { alert("Error al actualizar"); }
  };

  // --- ADMIN ---
  const handleCrearUsuario = async (e) => { e.preventDefault(); try { await axios.post(`${API_URL}/api/users`, newUser, config); setMensaje("✅ Usuario creado"); cargarDatosGenerales(); setNewUser({ run: '', nombre: '', apellido: '', password: '', rol: 'operador' }); } catch (e) { setMensaje(`❌ Error: ${e.response?.data?.error}`); } };
  const handleCrearDron = async (e) => { e.preventDefault(); try { await axios.post(`${API_URL}/api/drones`, newDrone, config); setMensaje("Dron OK"); cargarDatosGenerales(); } catch (e) { setMensaje("Error Dron"); }};
  const handleCrearBateria = async (e) => { e.preventDefault(); if(!newBattery.equipo_id) return alert("Asigna equipo"); try { await axios.post(`${API_URL}/api/baterias`, newBattery, config); setMensaje("Batería OK"); cargarDatosGenerales(); } catch (e) { setMensaje("Error Batería"); }};
  const handleToggleUser = async (u) => { try { await axios.put(`${API_URL}/api/users/${u._id}`, { activo: !u.activo }, config); cargarDatosGenerales(); } catch(e){} };
  const handleDeleteUser = async (id) => { if(window.confirm("⚠️ ¿ELIMINAR USUARIO?")) { try { await axios.delete(`${API_URL}/api/users/${id}`, config); cargarDatosGenerales(); } catch(e){ alert("Error"); } } };
  const handleDeleteDrone = async (id) => { if(window.confirm("⚠️ ¿ELIMINAR EQUIPO?")) { try { await axios.delete(`${API_URL}/api/drones/${id}`, config); cargarDatosGenerales(); } catch(e){ alert("Error"); } } };
  const handleDeleteBattery = async (id) => { if(window.confirm("⚠️ ¿ELIMINAR BATERÍA?")) { try { await axios.delete(`${API_URL}/api/baterias/${id}`, config); cargarDatosGenerales(); } catch(e){ alert("Error"); } } };

  const misBaterias = dronEnTurno ? baterias.filter(b => b.equipo_id?._id === dronEnTurno._id) : [];

  const renderSidebar = () => (
      <aside className="sidebar">
          <div className="brand">🚁 Operadores RPA</div>
          <div className="user-profile">
              <div className="user-avatar">{datosUsuario.nombre.charAt(0)}</div>
              <span className="user-name">{datosUsuario.nombre} {datosUsuario.apellido}</span>
              <span className="user-role">{rol === 'admin' ? 'Administrador' : 'Operador'}</span>
          </div>
          <nav className="menu">
              {rol === 'operador' && (
                  <>
                    {!dronEnTurno && <button className={`menu-btn ${activeTab === 'inicio_turno' ? 'active' : ''}`} onClick={()=>setActiveTab('inicio_turno')}>📍 Iniciar Turno</button>}
                    {dronEnTurno && <button className={`menu-btn ${activeTab === 'bitacora' ? 'active' : ''}`} onClick={()=>setActiveTab('bitacora')}>📝 Bitácora</button>}
                    {dronEnTurno && <button className={`menu-btn ${activeTab === 'cierre' ? 'active' : ''}`} onClick={()=>setActiveTab('cierre')}>🔋 Cierre Turno</button>}
                  </>
              )}
              {rol === 'admin' && (
                  <>
                    <button className={`menu-btn ${activeTab === 'admin_users' ? 'active' : ''}`} onClick={()=>setActiveTab('admin_users')}>👥 Usuarios</button>
                    <button className={`menu-btn ${activeTab === 'admin_drones' ? 'active' : ''}`} onClick={()=>setActiveTab('admin_drones')}>🚁 Equipos</button>
                    <button className={`menu-btn ${activeTab === 'admin_batteries' ? 'active' : ''}`} onClick={()=>setActiveTab('admin_batteries')}>🔋 Baterías</button>
                  </>
              )}
          </nav>
          <button className="btn-logout" onClick={handleLogout}>🚪 CERRAR SESIÓN</button>
      </aside>
  );

  return (
    <div className="app-container">
      {renderSidebar()}
      <main className="main-content">
        <header className="page-header">
            <h2>
                {activeTab === 'inicio_turno' && 'Configuración de Turno'}
                {activeTab === 'bitacora' && 'Bitácora de Vuelo'}
                {activeTab === 'cierre' && 'Gestión de Baterías'}
                {activeTab === 'admin_users' && 'Gestión de Usuarios'}
                {activeTab === 'admin_drones' && 'Inventario de Equipos'}
                {activeTab === 'admin_batteries' && 'Inventario de Baterías'}
            </h2>
            {mensaje && <div style={{padding:'15px', background:'var(--primary)', color:'white', borderRadius:'var(--radius)', marginTop:'15px'}}>{mensaje}</div>}
        </header>

        {activeTab === 'inicio_turno' && (
            <div className="card">
                <h3>1. Selecciona Base y Equipo</h3>
                <div style={{display:'grid', gap:'20px'}}>
                    <div><label>Base Operativa:</label><select id="selBase" onChange={(e)=>setBaseEnTurno(e.target.value)}><option value="">-- Seleccionar --</option>{opcionesBase.map(b=><option key={b} value={b}>{b}</option>)}</select></div>
                    <div><label>Equipo Disponible:</label><div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>{drones.filter(d=>d.estado==='disponible').map(d => (<button key={d._id} className="action-btn" onClick={() => iniciarTurno(d, document.getElementById('selBase').value)}>{d.matricula} - {d.modelo}</button>))}</div></div>
                </div>
            </div>
        )}

        {activeTab === 'bitacora' && dronEnTurno && (
            <>
                <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-sidebar)'}}>
                    <div><span className="badge active" style={{background:'var(--success)', color:'white', padding:'5px 10px', borderRadius:'15px'}}>EN TURNO</span><strong style={{marginLeft:'10px', fontSize:'1.2rem'}}>{dronEnTurno.matricula}</strong> ({baseEnTurno})</div>
                    <div><button className="action-btn" style={{background:'var(--primary)', marginRight:'10px'}} onClick={()=>setMostrarModalBitacora(true)}>Ver Historial</button><button className="action-btn" style={{background:'var(--danger)'}} onClick={liberarDronTurno}>FINALIZAR TURNO</button></div>
                </div>
                <div className="card">
                    <h3>Registrar Nuevo Vuelo</h3>
                    <form onSubmit={handleVueloSubmit} style={{gridTemplateColumns: '1fr 1fr'}}>
                        <div style={{gridColumn:'1/-1'}}><label>Fecha:</label><input type="date" value={formVuelo.fecha} onChange={e=>setFormVuelo({...formVuelo, fecha:e.target.value})} required /></div>
                        <div><label>Hora Inicio:</label><input type="time" onChange={e=>setFormVuelo({...formVuelo, hora_inicio:e.target.value})} required /></div>
                        <div><label>Hora Fin:</label><input type="time" onChange={e=>setFormVuelo({...formVuelo, hora_fin:e.target.value})} required /></div>
                        <div style={{gridColumn:'1/-1', textAlign:'center', padding:'10px', background:'var(--input-bg)', borderRadius:'8px', fontSize:'1.2rem'}}>Duración: <strong>{duracionCalc} minutos</strong></div>
                        <div><label>Predio/Sector:</label><input placeholder="Ej: Sector Norte" onChange={e=>setFormVuelo({...formVuelo, predio:e.target.value})} required /></div>
                        <div><label>Coordenadas:</label><input placeholder="Lat, Lon" onChange={e=>setFormVuelo({...formVuelo, coordenadas:e.target.value})} required /></div>
                        <div style={{gridColumn:'1/-1'}}><label>Observaciones:</label><textarea rows="3" onChange={e=>setFormVuelo({...formVuelo, observacion:e.target.value})} /></div>
                        <button className="action-btn" style={{gridColumn:'1/-1', background:'var(--success)', fontSize:'1.2rem'}}>GUARDAR BITÁCORA</button>
                    </form>
                </div>
            </>
        )}

        {activeTab === 'cierre' && (
            <div className="card">
                <h3>Actualización de Ciclos</h3>
                <form onSubmit={handleUpdatePar}>
                    <div className="card" style={{border:'1px solid var(--border)', background:'rgba(0,0,0,0.2)'}}>
                        <label style={{color:'var(--success)'}}>1. Batería Principal</label>
                        <select onChange={e=>setFormParBaterias({...formParBaterias, id_bat1: e.target.value})} required><option value="">Seleccionar Batería...</option>{misBaterias.map(b => <option key={b._id} value={b._id}>{b.serial} (Actual: {b.ciclos})</option>)}</select>
                        <input type="number" placeholder="Ingresar Nuevos Ciclos" onChange={e=>setFormParBaterias({...formParBaterias, ciclos1: e.target.value})} required />
                    </div>
                    <div className="card" style={{border:'1px solid var(--border)', background:'rgba(0,0,0,0.2)'}}>
                        <label style={{color:'var(--primary)'}}>2. Batería Secundaria (Opcional)</label>
                        <select onChange={e=>setFormParBaterias({...formParBaterias, id_bat2: e.target.value})}><option value="">Ninguna / Solo una</option>{misBaterias.filter(b => b._id !== formParBaterias.id_bat1).map(b => (<option key={b._id} value={b._id}>{b.serial} (Actual: {b.ciclos})</option>))}</select>
                        <input type="number" placeholder="Ingresar Nuevos Ciclos" onChange={e=>setFormParBaterias({...formParBaterias, ciclos2: e.target.value})} disabled={!formParBaterias.id_bat2} />
                    </div>
                    <label>Observaciones:</label><textarea rows="2" placeholder="Estado físico..." onChange={e=>setFormParBaterias({...formParBaterias, observacion: e.target.value})} />
                    <button className="action-btn" style={{background:'var(--warning)', color:'black'}}>ACTUALIZAR INVENTARIO</button>
                </form>
            </div>
        )}

        {activeTab === 'admin_users' && (
            <>
                <div className="card">
                    <h3>Crear Nuevo Usuario</h3>
                    <form onSubmit={handleCrearUsuario} style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
                        <input placeholder="R.U.N." value={newUser.run} onChange={e=>setNewUser({...newUser, run:e.target.value})} required/>
                        <input placeholder="Nombre" value={newUser.nombre} onChange={e=>setNewUser({...newUser, nombre:e.target.value})} required/>
                        <input placeholder="Apellido" value={newUser.apellido} onChange={e=>setNewUser({...newUser, apellido:e.target.value})} required/>
                        <input placeholder="Contraseña" value={newUser.password} type="password" onChange={e=>setNewUser({...newUser, password:e.target.value})} required/>
                        <select value={newUser.rol} onChange={e=>setNewUser({...newUser, rol:e.target.value})}><option value="operador">Operador</option><option value="admin">Administrador</option></select>
                        <button className="action-btn">Crear Usuario</button>
                    </form>
                </div>
                <div className="card table-container">
                    <h3>Listado de Personal</h3>
                    <table><thead><tr><th>Nombre</th><th>R.U.N.</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{users.map(u => (<tr key={u._id}><td>{u.nombre} {u.apellido}</td><td>{u.run}</td><td><span style={{background:'#333', padding:'4px 8px', borderRadius:'10px', fontSize:'0.8rem'}}>{u.rol}</span></td><td><span style={{color: u.activo ? 'var(--success)' : 'var(--danger)'}}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                            {u.run!=='admin' && <button className="btn-icon btn-toggle" title="Bloquear/Desbloquear" onClick={()=>handleToggleUser(u)}>🔒</button>}
                            {u.run!=='admin' && <button className="btn-icon btn-delete" title="Eliminar" onClick={()=>handleDeleteUser(u._id)}>🗑️</button>}
                        </td>
                    </tr>))}</tbody></table>
                </div>
            </>
        )}

        {activeTab === 'admin_drones' && (
            <>
                <div className="card">
                    <h3>Agregar Equipo</h3>
                    <form onSubmit={handleCrearDron} style={{gridTemplateColumns:'1fr 1fr'}}>
                        <input placeholder="Matrícula" onChange={e=>setNewDrone({...newDrone, matricula:e.target.value})} required/>
                        <input placeholder="Modelo" onChange={e=>setNewDrone({...newDrone, modelo:e.target.value})} required/>
                        <button className="action-btn" style={{gridColumn:'1/-1'}}>Guardar Equipo</button>
                    </form>
                </div>
                <div className="card table-container">
                    <h3>Flota Actual</h3>
                    <table><thead><tr><th>Matrícula</th><th>Modelo</th><th>Horas Vuelo</th><th>Acción</th></tr></thead><tbody>{drones.map(d=>(<tr key={d._id}><td>{d.matricula}</td><td>{d.modelo}</td><td>{d.horas_vuelo.toFixed(1)} hrs</td>
                        <td><button className="btn-icon btn-delete" onClick={()=>handleDeleteDrone(d._id)}>🗑️</button></td>
                    </tr>))}</tbody></table>
                </div>
            </>
        )}

        {activeTab === 'admin_batteries' && (
            <>
                <div className="card">
                    <h3>Registrar Batería</h3>
                    <form onSubmit={handleCrearBateria} style={{gridTemplateColumns:'1fr 1fr'}}>
                        <input placeholder="Número de Serie" onChange={e=>setNewBattery({...newBattery, serial:e.target.value})} required/>
                        <select onChange={e=>setNewBattery({...newBattery, equipo_id:e.target.value})} required><option value="">Asignar a Equipo...</option>{drones.map(d=><option key={d._id} value={d._id}>{d.matricula}</option>)}</select>
                        <button className="action-btn" style={{gridColumn:'1/-1'}}>Guardar Batería</button>
                    </form>
                </div>
                <div className="card table-container">
                    <h3>Estado de Baterías</h3>
                    <table><thead><tr><th>Equipo</th><th>Serial</th><th>Ciclos</th><th>Acción</th></tr></thead><tbody>{baterias.map(b=>(<tr key={b._id}><td>{b.equipo_id?.matricula || 'N/A'}</td><td style={{color:'var(--warning)'}}>{b.serial}</td><td>{b.ciclos}</td>
                        <td><button className="btn-icon btn-delete" onClick={()=>handleDeleteBattery(b._id)}>🗑️</button></td>
                    </tr>))}</tbody></table>
                </div>
            </>
        )}
      </main>

      {mostrarModalBitacora && (
        <div className="modal-overlay">
            <div className="modal-content">
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}><h2>📒 Mi Historial</h2><button className="action-btn" style={{background:'var(--danger)'}} onClick={()=>setMostrarModalBitacora(false)}>Cerrar</button></div>
                <table><thead><tr><th>Fecha</th><th>Predio</th><th>Duración</th></tr></thead><tbody>{vuelos.filter(v => v.operador_id?._id === datosUsuario.id).map(v => (<tr key={v._id}><td>{new Date(v.fecha).toLocaleDateString()}</td><td>{v.predio}</td><td>{v.duracion_min} min</td></tr>))}</tbody></table>
            </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
