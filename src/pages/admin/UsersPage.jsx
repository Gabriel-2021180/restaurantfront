import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import userService from '../../services/userService';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext'; // Importamos para saber quién soy yo
import { Users, UserPlus, Copy, Shield, Loader2, Ban, CheckCircle, AlertTriangle } from 'lucide-react'; // Nuevos iconos
import Swal from 'sweetalert2';

const UsersPage = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth(); // Obtenemos el usuario logueado
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

      const allowedRoles = safeRoles.filter(role => {
          const name = (role.slug || role.name || '').toLowerCase();
          if (name.includes('super')) return false;
          if (name.includes('chef') || name.includes('cocinero')) return false;
          return true;
      });

      setUsers(safeUsers);
      setRoles(allowedRoles);
      
    } catch (error) {
      console.error(t('usersPage.errorLoadingUsers'), error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE BANEO ---
  const handleToggleBan = async (targetUser) => {
    const isBanning = !targetUser.is_banned; // Si está false, pasará a true
    
    // 1. Confirmación con SweetAlert
    const result = await Swal.fire({
        title: isBanning ? '¿Banear Usuario?' : '¿Reactivar Usuario?',
        text: isBanning 
            ? `Se revocará el acceso inmediato a ${targetUser.first_names}.`
            : `El usuario ${targetUser.first_names} podrá volver a iniciar sesión.`,
        icon: isBanning ? 'warning' : 'question',
        showCancelButton: true,
        confirmButtonColor: isBanning ? '#d33' : '#10b981', // Rojo para banear, Verde para activar
        cancelButtonColor: '#6b7280',
        confirmButtonText: isBanning ? 'Sí, Banear' : 'Sí, Reactivar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
        // 2. Llamada al Backend
        await userService.updateUser(targetUser.id, { is_banned: isBanning });

        // 3. Actualizar estado local (para no recargar página)
        setUsers(prevUsers => prevUsers.map(u => 
            u.id === targetUser.id ? { ...u, is_banned: isBanning } : u
        ));

        Swal.fire(
            isBanning ? '¡Baneado!' : '¡Activado!',
            `El usuario ha sido ${isBanning ? 'bloqueado' : 'reactivado'} exitosamente.`,
            'success'
        );

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo actualizar el estado del usuario.', 'error');
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
        
        <button onClick={() => setIsInviteOpen(true)} className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold flex gap-2 items-center shadow-lg transition active:scale-95">
            <UserPlus size={18}/> {t('usersPage.generateInvitation')}
        </button>
      </div>

      {/* GRID DE USUARIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {users.length > 0 ? (
            users.map(user => {
                const isMe = currentUser?.id === user.id; // ¿Soy yo?
                const isBanned = user.is_banned; // ¿Está baneado?

                return (
                <div key={user.id} className={`p-5 rounded-2xl shadow-sm border relative group transition duration-300 ${
                    isBanned 
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900' // Estilo Baneado
                        : 'bg-white dark:bg-dark-card border-gray-100 dark:border-gray-700 hover:shadow-md' // Estilo Normal
                }`}>
                    
                    {/* Header Tarjeta */}
                    <div className="flex justify-between items-start mb-2">
                        <div className={`p-2 rounded-lg ${isBanned ? 'bg-red-100 text-red-600' : 'bg-blue-50 dark:bg-blue-900/20 text-primary'}`}>
                            {isBanned ? <Ban size={20}/> : <Shield size={20}/>}
                        </div>
                        
                        {/* Botón de Acción (Solo aparece si no soy yo) */}
                        {!isMe && (
                            <button 
                                onClick={() => handleToggleBan(user)}
                                className={`p-2 rounded-lg transition-colors ${
                                    isBanned 
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200' // Botón Reactivar
                                        : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600' // Botón Banear (discreto)
                                }`}
                                title={isBanned ? "Reactivar usuario" : "Banear usuario"}
                            >
                                {isBanned ? <CheckCircle size={18} /> : <Ban size={18} />}
                            </button>
                        )}
                    </div>

                    {/* Datos Usuario */}
                    <h3 className={`font-bold text-lg truncate ${isBanned ? 'text-red-800 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>
                        {user.first_names} {user.last_names} {isMe && "(Tú)"}
                    </h3>
                    <p className="text-gray-500 text-sm truncate mb-4">{user.email}</p>
                    
                    <div className="flex items-center justify-between mt-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                            isBanned ? 'bg-red-200 text-red-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                            {isBanned ? '⛔ BANEADO' : user.role?.name || t('usersPage.noRole')}
                        </span>
                        
                        <div className="text-xs text-gray-400">
                            {t('usersPage.registered')}: {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                        </div>
                    </div>
                </div>
            )})
        ) : (
            <div className="col-span-full text-center py-10 text-gray-400">
                {t('usersPage.noUsersFound')}
            </div>
        )}
      </div>

      {/* MODAL INVITACIÓN (Sin cambios) */}
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