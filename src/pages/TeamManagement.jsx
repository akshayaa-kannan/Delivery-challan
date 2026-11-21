import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Mail, 
  MapPin, 
  Warehouse as WarehouseIcon, 
  Key, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Copy, 
  Ban, 
  RotateCw, 
  ShieldAlert, 
  ArrowRightLeft,
  X,
  ExternalLink,
  ChevronDown,
  Eye,
  EyeOff,
  Share2,
  Check,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  ROLES, 
  PERMISSIONS, 
  hasPermission,
  getCompanyMembers, 
  updateMemberRoleSafely, 
  removeCompanyMemberSafely, 
  updateMemberStatus, 
  updateMemberScopes,
  transferOrganizationOwnership,
  createMemberInvitation, 
  getMemberInvitations, 
  revokeMemberInvitation, 
  acceptMemberInvitation,
  getBranches,
  getWarehouses,
  getUsageMetrics,
  registerOrUpdateMemberAuth,
  sendMemberPasswordReset
} from '../utils/storage';

export default function TeamManagement() {
  const { currentCompany, currentUser, role: userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'invitations'
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Messages
  const [actionMessage, setActionMessage] = useState(null);

  // Invite / Direct Create Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('direct'); // 'direct' (Instant account) | 'invite' (Email token/link)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(ROLES.OPERATIONS_STAFF);
  const [inviteBranchIds, setInviteBranchIds] = useState('ALL');
  const [inviteWarehouseIds, setInviteWarehouseIds] = useState('ALL');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Direct Credentials Creation Form State
  const [directName, setDirectName] = useState('');
  const [directEmail, setDirectEmail] = useState('');
  const [directPassword, setDirectPassword] = useState('Nayaruvi@2026');
  const [showDirectPassword, setShowDirectPassword] = useState(false);
  const [directRole, setDirectRole] = useState(ROLES.OPERATIONS_STAFF);
  const [directBranchIds, setDirectBranchIds] = useState('ALL');
  const [directWarehouseIds, setDirectWarehouseIds] = useState('ALL');
  const [creatingDirect, setCreatingDirect] = useState(false);

  // Credentials Ready Modal State
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Role Edit Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [targetMember, setTargetMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState(ROLES.OPERATIONS_STAFF);
  const [selectedBranches, setSelectedBranches] = useState('ALL');
  const [selectedWarehouses, setSelectedWarehouses] = useState('ALL');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Ownership Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetUid, setTransferTargetUid] = useState('');
  const [transferConfirmText, setTransferConfirmText] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Accept Invite Manual Modal
  const [isAcceptTokenModalOpen, setIsAcceptTokenModalOpen] = useState(false);
  const [acceptTokenInput, setAcceptTokenInput] = useState('');
  const [acceptingToken, setAcceptingToken] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [currentCompany?.id]);

  const loadAllData = async () => {
    if (!currentCompany?.id) return;
    try {
      setLoading(true);
      const [membersList, invitesList, branchList, whList, metrics] = await Promise.all([
        getCompanyMembers(currentCompany.id),
        getMemberInvitations(),
        getBranches(true),
        getWarehouses(),
        getUsageMetrics()
      ]);

      setMembers(membersList || []);
      setInvitations(invitesList || []);
      setBranches(branchList || []);
      setWarehouses(whList || []);
      setUsage(metrics);
    } catch (err) {
      console.error('Failed to load team data:', err);
      setActionMessage({ type: 'error', text: 'Error loading organization team data.' });
    } finally {
      setLoading(false);
    }
  };

  const isOwner = userRole === ROLES.OWNER || currentCompany?.ownerUid === currentUser?.uid;
  const canManageTeam = isOwner || userRole === ROLES.ADMIN;

  // Password Generator Helper
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setDirectPassword(`Nayaruvi@${rand}`);
  };

  // Direct Account Creation Handler
  const handleCreateDirectMember = async (e) => {
    e.preventDefault();
    setInviteError('');

    if (!directName.trim()) {
      setInviteError('Please provide employee full name.');
      return;
    }
    if (!directEmail.trim() || !directEmail.includes('@')) {
      setInviteError('Please provide a valid work email address.');
      return;
    }
    if (!directPassword || directPassword.length < 6) {
      setInviteError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setCreatingDirect(true);
      await registerOrUpdateMemberAuth({
        companyId: currentCompany.id,
        email: directEmail.trim(),
        password: directPassword.trim(),
        displayName: directName.trim(),
        role: directRole,
        branchIds: directBranchIds,
        warehouseIds: directWarehouseIds,
        actor: currentUser
      });

      // Prepare credentials for display
      setCreatedCredentials({
        displayName: directName.trim(),
        email: directEmail.trim(),
        password: directPassword.trim(),
        role: directRole,
        companyName: currentCompany?.displayName || currentCompany?.legalName || 'Nayaruvi Workspace',
        loginUrl: `${window.location.origin}/login`
      });

      setIsInviteModalOpen(false);
      setIsCredentialsModalOpen(true);
      setDirectName('');
      setDirectEmail('');
      setDirectPassword('Nayaruvi@2026');

      setActionMessage({
        type: 'success',
        text: `Staff account created successfully for ${directName.trim()} (${directEmail.trim()}).`
      });
      await loadAllData();
    } catch (err) {
      setInviteError(err.message || 'Failed to create member account.');
    } finally {
      setCreatingDirect(false);
    }
  };

  // Copy Credentials to Clipboard
  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Nayaruvi Delivery Challan Portal Login\nCompany: ${createdCredentials.companyName}\nRole: ${createdCredentials.role}\nLogin URL: ${createdCredentials.loginUrl}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 3000);
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    if (!createdCredentials) return;
    const text = `*Nayaruvi Delivery Challan Portal Credentials*\n\n🏢 Company: ${createdCredentials.companyName}\n👤 Role: ${createdCredentials.role}\n🔗 Login URL: ${createdCredentials.loginUrl}\n📧 Email: ${createdCredentials.email}\n🔑 Password: ${createdCredentials.password}\n\nPlease log in and update your password if desired.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Send Password Reset
  const handleSendPasswordReset = async (member) => {
    try {
      const sent = await sendMemberPasswordReset(member.email);
      if (sent) {
        setActionMessage({
          type: 'success',
          text: `Password reset email dispatched to ${member.email}.`
        });
      } else {
        setActionMessage({
          type: 'info',
          text: `Password reset requested for ${member.email}. If using demo offline mode, password is saved in system.`
        });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Invite Member Handler
  const handleSendInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteError('Please provide a valid employee email address.');
      return;
    }

    try {
      setInviting(true);
      const inviteObj = await createMemberInvitation({
        email: inviteEmail.trim(),
        role: inviteRole,
        branchIds: inviteBranchIds,
        warehouseIds: inviteWarehouseIds
      }, currentUser);

      setIsInviteModalOpen(false);
      setInviteEmail('');
      setActionMessage({
        type: 'success',
        text: `Invitation successfully sent to ${inviteObj.email}. Valid for 7 days.`
      });
      await loadAllData();
    } catch (err) {
      setInviteError(err.message || 'Failed to dispatch invitation.');
    } finally {
      setInviting(false);
    }
  };

  // Revoke Invite Handler
  const handleRevokeInvite = async (invitationId, email) => {
    if (!window.confirm(`Revoke invitation for ${email}?`)) return;
    try {
      await revokeMemberInvitation(invitationId, currentUser);
      setActionMessage({
        type: 'success',
        text: `Invitation for ${email} has been revoked.`
      });
      await loadAllData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Copy Invitation Link
  const handleCopyInviteLink = (token) => {
    const inviteUrl = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setActionMessage({
      type: 'success',
      text: 'Invitation link copied to clipboard! Share it with the invitee.'
    });
  };

  // Open Role / Scopes Modal
  const handleOpenRoleModal = (member) => {
    setTargetMember(member);
    setSelectedRole(member.role || ROLES.OPERATIONS_STAFF);
    setSelectedBranches(member.branchIds || 'ALL');
    setSelectedWarehouses(member.warehouseIds || 'ALL');
    setIsRoleModalOpen(true);
  };

  // Save Role / Scopes
  const handleSaveRoleAndScopes = async (e) => {
    e.preventDefault();
    if (!targetMember) return;
    try {
      setUpdatingRole(true);

      if (selectedRole !== targetMember.role) {
        await updateMemberRoleSafely(targetMember.uid, selectedRole, currentUser);
      }

      await updateMemberScopes(targetMember.uid, {
        branchIds: selectedBranches,
        warehouseIds: selectedWarehouses
      }, currentUser);

      setIsRoleModalOpen(false);
      setActionMessage({
        type: 'success',
        text: `Updated role and scopes for ${targetMember.displayName || targetMember.email}.`
      });
      await loadAllData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setUpdatingRole(false);
    }
  };

  // Toggle Suspend Status
  const handleToggleStatus = async (member) => {
    const nextStatus = member.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    try {
      await updateMemberStatus(member.uid, nextStatus, currentUser);
      setActionMessage({
        type: 'success',
        text: `Member status updated to ${nextStatus}.`
      });
      await loadAllData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Remove Member
  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove ${member.displayName || member.email} from the organization?`)) {
      return;
    }
    try {
      await removeCompanyMemberSafely(member.uid, currentUser);
      setActionMessage({
        type: 'success',
        text: `Member ${member.displayName || member.email} removed.`
      });
      await loadAllData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Ownership Transfer Handler
  const handleTransferOwnership = async (e) => {
    e.preventDefault();
    if (transferConfirmText !== 'TRANSFER') {
      alert('Please type TRANSFER in capital letters to confirm.');
      return;
    }
    if (!transferTargetUid) {
      alert('Please select a successor from the team.');
      return;
    }
    try {
      setTransferring(true);
      await transferOrganizationOwnership(currentUser.uid, transferTargetUid, currentUser);
      setIsTransferModalOpen(false);
      setActionMessage({
        type: 'success',
        text: 'Organization ownership successfully transferred. You are now an Administrator.'
      });
      await loadAllData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setTransferring(false);
    }
  };

  // Accept Token Test
  const handleAcceptToken = async (e) => {
    e.preventDefault();
    if (!acceptTokenInput.trim()) return;
    try {
      setAcceptingToken(true);
      await acceptMemberInvitation(acceptTokenInput.trim(), {
        uid: currentUser?.uid || `usr_${Date.now()}`,
        email: currentUser?.email || 'accepted_user@company.com',
        displayName: currentUser?.displayName || 'Team Member'
      });
      setIsAcceptTokenModalOpen(false);
      setAcceptTokenInput('');
      setActionMessage({
        type: 'success',
        text: 'Invitation accepted successfully! Workspace membership confirmed.'
      });
      await loadAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setAcceptingToken(false);
    }
  };

  // Filtered lists
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      (m.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (roleFilter === 'ALL') return matchesSearch;
    return matchesSearch && m.role === roleFilter;
  });

  const memberLimit = usage?.usage?.members?.max || 3;
  const currentMemberCount = usage?.usage?.members?.current || members.length;
  const isMemberLimitReached = currentMemberCount >= memberLimit;

  const roleBadgeColor = {
    [ROLES.OWNER]: 'bg-purple-100 text-purple-800 border-purple-200',
    [ROLES.ADMIN]: 'bg-blue-100 text-blue-800 border-blue-200',
    [ROLES.MANAGER]: 'bg-amber-100 text-amber-800 border-amber-200',
    [ROLES.OPERATIONS_STAFF]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [ROLES.WAREHOUSE_STAFF]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    [ROLES.VIEWER]: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="text-amber-500" size={28} />
            Team & Access Control
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage employees, granular role permissions, location scopes, and pending invitations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isOwner && (
            <button
              onClick={() => {
                setTransferConfirmText('');
                setTransferTargetUid('');
                setIsTransferModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-xs"
            >
              <ArrowRightLeft size={16} />
              Transfer Ownership
            </button>
          )}

          {canManageTeam && (
            <button
              onClick={() => {
                setModalMode('direct');
                setInviteError('');
                setIsInviteModalOpen(true);
              }}
              disabled={isMemberLimitReached}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all ${
                isMemberLimitReached
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20 active:scale-95'
              }`}
            >
              <UserPlus size={18} />
              + Add Staff / Invite
            </button>
          )}
        </div>
      </div>

      {/* Quick Team Guidance Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-100">Team Login & Access Management</div>
            <div className="text-xs text-slate-400">
              Create manager and staff accounts with custom passwords. Your employees can directly log in at <span className="font-mono text-amber-400 font-semibold">/login</span> to access features permitted for their role.
            </div>
          </div>
        </div>
        {canManageTeam && !isMemberLimitReached && (
          <button
            onClick={() => {
              setModalMode('direct');
              setInviteError('');
              setIsInviteModalOpen(true);
            }}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shrink-0 transition-all cursor-pointer shadow-sm"
          >
            + Create Staff Login
          </button>
        )}
      </div>

      {/* Plan Limits Alert */}
      {isMemberLimitReached && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div className="text-sm">
            <span className="font-bold text-amber-900">Team seat limit reached ({currentMemberCount}/{memberLimit}): </span>
            <span className="text-amber-800">
              Upgrade your organization to Growth Business (10 seats) or Enterprise (100 seats) to invite more staff members.
            </span>
          </div>
        </div>
      )}

      {/* Action Messages */}
      {actionMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'members'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={16} />
            Active Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'invitations'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock size={16} />
            Pending Invitations ({invitations.filter(i => i.status === 'PENDING').length})
          </button>
        </div>

        <button
          onClick={() => setIsAcceptTokenModalOpen(true)}
          className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1.5 pb-2"
        >
          <Key size={14} />
          Enter Invitation Token
        </button>
      </div>

      {activeTab === 'members' ? (
        <>
          {/* Member Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="ALL">All Roles</option>
                {Object.values(ROLES).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Members Table */}
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-amber-500" size={32} />
              <div className="text-sm font-semibold text-slate-500">Loading team members...</div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <Users className="mx-auto text-slate-300 mb-3" size={48} />
              <h3 className="text-base font-bold text-slate-800">No members found</h3>
              <p className="text-sm text-slate-500 mt-1">Try refining your search or role filter.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">User</th>
                      <th className="px-6 py-3.5">Assigned Role</th>
                      <th className="px-6 py-3.5">Location Scopes</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMembers.map((member) => {
                      const isTargetOwner = member.role === ROLES.OWNER;
                      const isSelf = member.uid === currentUser?.uid;
                      const isSuspended = member.status === 'SUSPENDED';

                      return (
                        <tr key={member.uid} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                                {(member.displayName || member.email || 'U')[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                  {member.displayName || 'Team Member'}
                                  {isSelf && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500">{member.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-md border ${
                              roleBadgeColor[member.role] || roleBadgeColor[ROLES.VIEWER]
                            }`}>
                              <ShieldCheck size={14} />
                              {member.role || ROLES.VIEWER}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="space-y-1 text-xs text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <MapPin size={13} className="text-slate-400" />
                                <span>
                                  Branches:{' '}
                                  <strong className="text-slate-800">
                                    {member.branchIds === 'ALL' || !member.branchIds
                                      ? 'All Branches' 
                                      : Array.isArray(member.branchIds) 
                                        ? `${member.branchIds.length} Assigned` 
                                        : 'Scoped'}
                                  </strong>
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <WarehouseIcon size={13} className="text-slate-400" />
                                <span>
                                  Warehouses:{' '}
                                  <strong className="text-slate-800">
                                    {member.warehouseIds === 'ALL' || !member.warehouseIds
                                      ? 'All Warehouses'
                                      : Array.isArray(member.warehouseIds)
                                        ? `${member.warehouseIds.length} Assigned`
                                        : 'Scoped'}
                                  </strong>
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              isSuspended 
                                ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isSuspended ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                              {member.status || 'ACTIVE'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            {canManageTeam && !isSelf && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenRoleModal(member)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Change Role & Location Scopes"
                                >
                                  <Edit3 size={16} />
                                </button>

                                <button
                                  onClick={() => handleSendPasswordReset(member)}
                                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Send Password Reset Email"
                                >
                                  <KeyRound size={16} />
                                </button>

                                {!isTargetOwner && (
                                  <>
                                    <button
                                      onClick={() => handleToggleStatus(member)}
                                      className={`p-1.5 rounded-lg transition-colors ${
                                        isSuspended 
                                          ? 'text-emerald-600 hover:bg-emerald-50' 
                                          : 'text-amber-600 hover:bg-amber-50'
                                      }`}
                                      title={isSuspended ? 'Reactivate Member' : 'Suspend Member'}
                                    >
                                      {isSuspended ? <RotateCw size={16} /> : <Ban size={16} />}
                                    </button>

                                    <button
                                      onClick={() => handleRemoveMember(member)}
                                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Remove from Workspace"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Pending Invitations View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {invitations.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="mx-auto text-slate-300 mb-3" size={44} />
              <h3 className="text-base font-bold text-slate-800">No pending invitations</h3>
              <p className="text-sm text-slate-500 mt-1">All sent invitations have been accepted or expired.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Invited Email</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Expires In</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map((inv) => {
                    const isPending = inv.status === 'PENDING';
                    const expiresAt = new Date(inv.expiresAt);
                    const daysRemaining = Math.max(0, Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24)));

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{inv.email}</div>
                          <div className="text-xs text-slate-400 font-mono">Token: {inv.token?.slice(0, 16)}...</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-md border ${
                            roleBadgeColor[inv.role] || roleBadgeColor[ROLES.VIEWER]
                          }`}>
                            {inv.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-600">
                          {isPending ? `${daysRemaining} days left` : 'Expired / Finalized'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            inv.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                            inv.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isPending && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleCopyInviteLink(inv.token)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors"
                                title="Copy Invite Link"
                              >
                                <Copy size={13} />
                                Copy Link
                              </button>
                              <button
                                onClick={() => handleRevokeInvite(inv.id, inv.email)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                Revoke
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Member / Direct Account Setup Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserPlus className="text-amber-400" size={20} />
                <h3 className="font-bold text-base">Add Team Member</h3>
              </div>
              <button 
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setInviteError('');
                }} 
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-4">
              <button
                type="button"
                onClick={() => {
                  setModalMode('direct');
                  setInviteError('');
                }}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  modalMode === 'direct'
                    ? 'border-amber-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <KeyRound size={14} className={modalMode === 'direct' ? 'text-amber-600' : ''} />
                Direct Account Setup (Recommended)
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalMode('invite');
                  setInviteError('');
                }}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  modalMode === 'invite'
                    ? 'border-amber-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Mail size={14} className={modalMode === 'invite' ? 'text-amber-600' : ''} />
                Send Invite Link / Token
              </button>
            </div>

            {modalMode === 'direct' ? (
              /* Option 1: Direct Account & Password Creation */
              <form onSubmit={handleCreateDirectMember} className="p-6 space-y-4">
                {inviteError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-xl text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold">Instant Login Setup:</span> Create an employee login account with a custom password. You can share these credentials immediately, and they can sign in at <strong>/login</strong>.
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Employee Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Work Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={directEmail}
                    onChange={(e) => setDirectEmail(e.target.value)}
                    placeholder="rahul@company.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Password with generator */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Login Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline"
                    >
                      Generate Secure Password
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showDirectPassword ? 'text' : 'password'}
                      required
                      value={directPassword}
                      onChange={(e) => setDirectPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDirectPassword(!showDirectPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showDirectPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role & Permissions</label>
                  <select
                    value={directRole}
                    onChange={(e) => setDirectRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value={ROLES.MANAGER}>MANAGER (Challans, inventory, goods receipts)</option>
                    <option value={ROLES.OPERATIONS_STAFF}>OPERATIONS_STAFF (Create/edit challans, transport)</option>
                    <option value={ROLES.WAREHOUSE_STAFF}>WAREHOUSE_STAFF (Stock movements, receipts, returns)</option>
                    <option value={ROLES.ADMIN}>ADMIN (Full workspace controls)</option>
                    <option value={ROLES.VIEWER}>VIEWER (Read-only access)</option>
                  </select>
                </div>

                {/* Scopes */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Branch Scope</label>
                    <select
                      value={directBranchIds}
                      onChange={(e) => setDirectBranchIds(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      <option value="ALL">All Branches</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.branchCode} - {b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Warehouse Scope</label>
                    <select
                      value={directWarehouseIds}
                      onChange={(e) => setDirectWarehouseIds(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      <option value="ALL">All Warehouses</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingDirect}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {creatingDirect ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Create Login Account</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Option 2: Self-service Invitation Token / Link */
              <form onSubmit={handleSendInvite} className="p-6 space-y-4">
                {inviteError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="employee@company.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role & Permissions</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value={ROLES.MANAGER}>MANAGER (Challans, inventory, goods receipts)</option>
                    <option value={ROLES.OPERATIONS_STAFF}>OPERATIONS_STAFF (Create/edit challans, transport)</option>
                    <option value={ROLES.WAREHOUSE_STAFF}>WAREHOUSE_STAFF (Stock movements, receipts, returns)</option>
                    <option value={ROLES.ADMIN}>ADMIN (Full workspace controls)</option>
                    <option value={ROLES.VIEWER}>VIEWER (Read-only access)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Branch Scope</label>
                    <select
                      value={inviteBranchIds}
                      onChange={(e) => setInviteBranchIds(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      <option value="ALL">All Branches</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.branchCode} - {b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Warehouse Scope</label>
                    <select
                      value={inviteWarehouseIds}
                      onChange={(e) => setInviteWarehouseIds(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      <option value="ALL">All Warehouses</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  An invitation token will be generated. The invitee can join by clicking the invitation link or visiting <strong>/accept-invite</strong>.
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {inviting && <Loader2 size={14} className="animate-spin" />}
                    Generate Invitation Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Login Credentials Ready Modal */}
      {isCredentialsModalOpen && createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={24} className="text-emerald-200" />
                <div>
                  <h3 className="font-black text-base">Account Created!</h3>
                  <p className="text-xs text-emerald-100">Login credentials ready to share with employee</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCredentialsModalOpen(false)} 
                className="text-emerald-200 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-bold text-slate-900">{createdCredentials.displayName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Assigned Role:</span>
                  <span className="font-black text-amber-600">{createdCredentials.role}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Login Email:</span>
                  <span className="font-mono font-bold text-slate-900">{createdCredentials.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Password:</span>
                  <span className="font-mono font-black text-slate-900 bg-amber-100/70 px-2 py-0.5 rounded">
                    {createdCredentials.password}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Login Portal:</span>
                  <span className="font-mono text-amber-700 font-bold truncate max-w-[200px]">
                    {createdCredentials.loginUrl}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed">
                The employee can navigate to <strong>{createdCredentials.loginUrl}</strong> on any computer or phone and sign in with the email and password above.
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copiedCredentials ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedCredentials ? 'Copied!' : 'Copy Credentials'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Share2 size={14} />
                  <span>Share WhatsApp</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsCredentialsModalOpen(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role & Scopes Modal */}
      {isRoleModalOpen && targetMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Edit Role & Permissions</h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRoleAndScopes} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">User</label>
                <div className="font-bold text-slate-900 text-sm">{targetMember.displayName || targetMember.email}</div>
                <div className="text-xs text-slate-500">{targetMember.email}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {Object.values(ROLES).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Branch Access Scope</label>
                <select
                  value={Array.isArray(selectedBranches) ? selectedBranches[0] : selectedBranches}
                  onChange={(e) => setSelectedBranches(e.target.value === 'ALL' ? 'ALL' : [e.target.value])}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="ALL">All Branches (Global Access)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.branchCode} - {b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Warehouse Access Scope</label>
                <select
                  value={Array.isArray(selectedWarehouses) ? selectedWarehouses[0] : selectedWarehouses}
                  onChange={(e) => setSelectedWarehouses(e.target.value === 'ALL' ? 'ALL' : [e.target.value])}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="ALL">All Warehouses (Global Access)</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRole}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs"
                >
                  {updatingRole && <Loader2 size={14} className="animate-spin inline mr-1" />}
                  Save Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-rose-300 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-rose-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-rose-400" size={20} />
                <h3 className="font-bold text-base">Transfer Organization Ownership</h3>
              </div>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTransferOwnership} className="p-6 space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <strong>Warning:</strong> You are transferring primary ownership of{' '}
                <strong>{currentCompany?.displayName || currentCompany?.legalName}</strong>. You will be demoted to Administrator.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select New Owner</label>
                <select
                  required
                  value={transferTargetUid}
                  onChange={(e) => setTransferTargetUid(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="">-- Choose team member --</option>
                  {members.filter(m => m.uid !== currentUser?.uid).map(m => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName || m.email} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Type <span className="font-mono text-rose-600 font-black">TRANSFER</span> to confirm
                </label>
                <input
                  type="text"
                  required
                  value={transferConfirmText}
                  onChange={(e) => setTransferConfirmText(e.target.value)}
                  placeholder="TRANSFER"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring || transferConfirmText !== 'TRANSFER' || !transferTargetUid}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-40"
                >
                  {transferring && <Loader2 size={14} className="animate-spin inline mr-1" />}
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accept Token Modal */}
      {isAcceptTokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="text-amber-400" size={18} />
                <h3 className="font-bold text-base">Redeem Invitation Token</h3>
              </div>
              <button onClick={() => setIsAcceptTokenModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAcceptToken} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Invitation Token</label>
                <input
                  type="text"
                  required
                  value={acceptTokenInput}
                  onChange={(e) => setAcceptTokenInput(e.target.value)}
                  placeholder="e.g. inv_mvm..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAcceptTokenModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={acceptingToken}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs"
                >
                  {acceptingToken && <Loader2 size={14} className="animate-spin inline mr-1" />}
                  Accept & Join Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
