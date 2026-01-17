import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import userService from '../../services/userService';
import Modal from '../../components/ui/Modal';
import { Users, UserPlus, Copy, Shield, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

const UsersPage = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  
  // Estado Invitación
  const [selectedRoleInvite, setSelectedRoleInvite] = useState('');
  const [generatedCode, setGeneratedCode] = useState(null);

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

      const safeUsers = Array.isArray(usersData) ? usersData : (usersData.data || []);
      const safeRoles = Array.isArray(rolesData) ? rolesData : (rolesData.data || []);

      // 🔥 FILTRO DE ROLES: Quitamos Super Admin y Chef
      const allowedRoles = safeRoles.filter(role => {
          const name = (role.slug || role.name || '').toLowerCase();
          
          // 1. Ocultar Super Admin (Seguridad)
          if (name.includes('super')) return false;
          
          // 2. Ocultar Chef (Requerimiento de negocio)
          if (name.includes('chef') || name.includes('cocinero')) return false;

          // Deberían quedar solo: admin, mesero(waiter), cajero(cashier)
          return true;
      });

      setUsers(safeUsers);
      setRoles(allowedRoles); // <--- Guardamos la lista filtrada
      
    } catch (error) {
      console.error(t('usersPage.errorLoadingUsers'), error);
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
      Swal.fire(t('usersPage.error'), t('usersPage.couldNotGenerateCode'), 'error');
    }
  };

  const copyToClipboard = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode.code);
    Swal.fire({
        icon: 'success', title: t('usersPage.copied'), text: t('usersPage.readyToSendWhatsApp'),
        timer: 1500, showConfirmButton: false
    });
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Users className="text-primary"/> {t('usersPage.workTeam')}
            </h2>
            <p className="text-gray-500 text-sm">{t('usersPage.manageAccessSystem')}</p>
        </div>
        
        {/* ÚNICO BOTÓN: Generar Invitación */}
        <button onClick={() => setIsInviteOpen(true)} className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold flex gap-2 items-center shadow-lg transition active:scale-95">
            <UserPlus size={18}/> {t('usersPage.generateInvitation')}
        </button>
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
                            {user.role?.name || t('usersPage.noRole')}
                        </span>
                    </div>
                    {/* Nombres completos concatenados */}
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white truncate">
                        {user.first_names} {user.last_names}
                    </h3>
                    <p className="text-gray-500 text-sm truncate mb-4">{user.email}</p>
                    
                    <div className="text-xs text-gray-400">
                        {t('usersPage.registered')}: {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </div>
                </div>
            ))
        ) : (
            <div className="col-span-full text-center py-10 text-gray-400">
                {t('usersPage.noUsersFound')}
            </div>
        )}
      </div>

      {/* MODAL INVITACIÓN (Único modal activo) */}
      <Modal isOpen={isInviteOpen} onClose={() => {setIsInviteOpen(false); setGeneratedCode(null);}} title={t('usersPage.generateAccessCode')}>
        {!generatedCode ? (
            <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                    <p>{t('usersPage.inviteExplanation')}</p>
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('usersPage.whatRole')}</label>
                    <select className="w-full p-3 border rounded-xl mt-1 dark:bg-gray-800 dark:text-white" value={selectedRoleInvite} onChange={e=>setSelectedRoleInvite(e.target.value)}>
                        <option value="">{t('usersPage.selectRole')}</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
                <button onClick={handleGenerateInvite} disabled={!selectedRoleInvite} className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow hover:bg-primary-dark transition disabled:opacity-50">
                    {t('usersPage.generateCode')}
                </button>
            </div>
        ) : (
            <div className="text-center space-y-6 py-2">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">{t('usersPage.generatedCode')}</p>
                    <div className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 relative cursor-pointer hover:border-primary transition" onClick={copyToClipboard}>
                        <p className="text-4xl font-mono font-black text-primary tracking-widest">{generatedCode.code}</p>
                        <p className="text--[10px] text-gray-400 mt-2">{t('usersPage.clickToCopy')}</p>
                    </div>
                </div>
                <div className="bg-orange-50 text-orange-700 p-3 rounded-xl text-xs">⚠️ {t('usersPage.codeExpires')}</div>
                <button onClick={copyToClipboard} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl flex justify-center gap-2 shadow-lg hover:bg-green-700">
                    <Copy/> {t('usersPage.copyCode')}
                </button>
            </div>
        )}
      </Modal>
    </div>
  );
};

export default UsersPage;