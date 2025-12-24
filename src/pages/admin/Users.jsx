import { useState, useEffect } from 'react';
import userService from '../../services/userService';
import Modal from '../../components/ui/Modal';
import { Users, UserPlus, Copy, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  
  // Estado para el código generado
  const [generatedCode, setGeneratedCode] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [u, r] = await Promise.all([userService.getAllUsers(), userService.getRoles()]);
    setUsers(u);
    setRoles(r);
  };

  const handleGenerateInvite = async () => {
    try {
      const res = await userService.createInvite({ role_id: selectedRole });
      setGeneratedCode(res); // Guardamos la respuesta { code, expires_at }
    } catch (error) {
      console.error(error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode.code);
    Swal.fire('Copiado', 'Código copiado al portapapeles', 'success');
  };

  const closeInviteModal = () => {
      setIsInviteOpen(false);
      setGeneratedCode(null);
      setSelectedRole('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold flex gap-2"><Users/> Equipo de Trabajo</h2>
        <button onClick={() => setIsInviteOpen(true)} className="bg-primary text-white px-4 py-2 rounded-lg font-bold flex gap-2">
            <UserPlus size={18}/> Generar Invitación
        </button>
      </div>

      {/* LISTA DE USUARIOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {users.map(user => (
            <div key={user.id} className="bg-white p-4 rounded-xl shadow border-l-4 border-primary">
                <p className="font-bold text-lg">{user.name}</p>
                <p className="text-gray-500 text-sm">{user.email}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-gray-100 rounded text-xs font-bold uppercase">{user.role}</span>
            </div>
        ))}
      </div>

      {/* MODAL INVITACIÓN */}
      <Modal isOpen={isInviteOpen} onClose={closeInviteModal} title="Generar Código de Acceso">
        {!generatedCode ? (
            <div className="space-y-4">
                <p className="text-sm text-gray-600">Selecciona qué rol tendrá el nuevo empleado.</p>
                <select className="w-full p-3 border rounded-xl" value={selectedRole} onChange={e=>setSelectedRole(e.target.value)}>
                    <option value="">Seleccionar Rol...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button onClick={handleGenerateInvite} disabled={!selectedRole} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">
                    Crear Código
                </button>
            </div>
        ) : (
            <div className="text-center space-y-4">
                <div className="bg-gray-100 p-4 rounded-xl border border-dashed border-gray-400">
                    <p className="text-xs text-gray-500 uppercase mb-1">Código generado</p>
                    <p className="text-3xl font-mono font-black tracking-widest text-indigo-600">{generatedCode.code}</p>
                </div>
                <p className="text-xs text-red-500">Expira en 24 horas</p>
                
                <button onClick={copyToClipboard} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl flex justify-center gap-2">
                    <Copy/> Copiar para WhatsApp
                </button>
                <button onClick={closeInviteModal} className="text-sm text-gray-500 underline">Cerrar</button>
            </div>
        )}
      </Modal>
    </div>
  );
};
export default UsersPage;