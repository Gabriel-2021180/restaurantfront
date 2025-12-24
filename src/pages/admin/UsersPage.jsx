import { useState, useEffect } from 'react';
import userService from '../../services/userService';
import Modal from '../../components/ui/Modal';
import { Users, UserPlus, Copy, Shield, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Estado Invitación
  const [selectedRoleInvite, setSelectedRoleInvite] = useState('');
  const [generatedCode, setGeneratedCode] = useState(null);

  // Estado Crear Manual
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role_id: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        userService.getAllUsers(),
        userService.getRoles()
      ]);

      // --- PROTECCIÓN CONTRA FORMATO DE DATOS ---
      // Aseguramos que sea un array, venga como venga
      const safeUsers = Array.isArray(usersData) ? usersData : (usersData.data || []);
      const safeRoles = Array.isArray(rolesData) ? rolesData : (rolesData.data || []);

      setUsers(safeUsers);
      setRoles(safeRoles);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      // No mostramos alerta bloqueante para no interrumpir la navegación
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA INVITACIÓN ---
  const handleGenerateInvite = async () => {
    if (!selectedRoleInvite) return;
    try {
      const res = await userService.createInvite({ role_id: selectedRoleInvite });
      setGeneratedCode(res);
    } catch (error) {
      Swal.fire('Error', 'No se pudo generar el código', 'error');
    }
  };

  const copyToClipboard = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode.code);
    Swal.fire({
        icon: 'success', title: 'Copiado', text: 'Listo para enviar por WhatsApp',
        timer: 1500, showConfirmButton: false
    });
  };

  // --- LÓGICA CREAR MANUAL ---
  const handleCreateManual = async (e) => {
    e.preventDefault();
    try {
      await userService.createUser(formData);
      Swal.fire('Creado', 'Usuario creado exitosamente', 'success');
      setIsCreateOpen(false);
      setFormData({ name: '', email: '', password: '', role_id: '' });
      loadData();
    } catch (error) {
      Swal.fire('Error', 'No se pudo crear el usuario', 'error');
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Users className="text-primary"/> Equipo de Trabajo
            </h2>
            <p className="text-gray-500 text-sm">Gestiona quién tiene acceso a tu sistema.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setIsCreateOpen(true)} className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-xl font-bold text-sm transition">
                Crear Manualmente
            </button>
            <button onClick={() => setIsInviteOpen(true)} className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-xl font-bold flex gap-2 items-center shadow-lg transition active:scale-95">
                <UserPlus size={18}/> Generar Invitación
            </button>
        </div>
      </div>

      {/* GRID DE USUARIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {users.length > 0 ? (
            users.map(user => (
                <div key={user.id} className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative group hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary">
                            <Shield size={20}/>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                            {user.role?.name || "Sin Rol"}
                        </span>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white truncate">{user.name}</h3>
                    <p className="text-gray-500 text-sm truncate mb-4">{user.email}</p>
                    
                    <div className="text-xs text-gray-400">
                        Registrado: {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </div>
                </div>
            ))
        ) : (
            <div className="col-span-full text-center py-10 text-gray-400">
                No se encontraron usuarios.
            </div>
        )}
      </div>

      {/* MODAL INVITACIÓN */}
      <Modal isOpen={isInviteOpen} onClose={() => {setIsInviteOpen(false); setGeneratedCode(null);}} title="Generar Código de Acceso">
        {!generatedCode ? (
            <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                    <p>Esto generará un código único para que tu empleado se registre solo.</p>
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">¿Qué rol tendrá?</label>
                    <select className="w-full p-3 border rounded-xl mt-1 dark:bg-gray-800 dark:text-white" value={selectedRoleInvite} onChange={e=>setSelectedRoleInvite(e.target.value)}>
                        <option value="">Seleccionar Rol...</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
                <button onClick={handleGenerateInvite} disabled={!selectedRoleInvite} className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow hover:bg-primary-dark transition disabled:opacity-50">
                    Generar Código
                </button>
            </div>
        ) : (
            <div className="text-center space-y-6 py-2">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Código generado</p>
                    <div className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 relative cursor-pointer hover:border-primary transition" onClick={copyToClipboard}>
                        <p className="text-4xl font-mono font-black text-primary tracking-widest">{generatedCode.code}</p>
                        <p className="text-[10px] text-gray-400 mt-2">Haz clic para copiar</p>
                    </div>
                </div>
                <div className="bg-orange-50 text-orange-700 p-3 rounded-xl text-xs">⚠️ Este código expira en 24 horas.</div>
                <button onClick={copyToClipboard} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl flex justify-center gap-2 shadow-lg hover:bg-green-700">
                    <Copy/> Copiar Código
                </button>
            </div>
        )}
      </Modal>

      {/* MODAL CREAR MANUAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Crear Usuario Manualmente">
        <form onSubmit={handleCreateManual} className="space-y-4">
            <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nombre Completo</label>
                <input type="text" required className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})}/>
            </div>
            <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Correo Electrónico</label>
                <input type="email" required className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" value={formData.email} onChange={e=>setFormData({...formData, email:e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Contraseña</label>
                    <input type="password" required className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" value={formData.password} onChange={e=>setFormData({...formData, password:e.target.value})}/>
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Rol</label>
                    <select required className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" value={formData.role_id} onChange={e=>setFormData({...formData, role_id:e.target.value})}>
                        <option value="">Elegir...</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
            </div>
            <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-xl mt-2 shadow hover:bg-primary-dark">
                Crear Usuario
            </button>
        </form>
      </Modal>
    </div>
  );
};

export default UsersPage;