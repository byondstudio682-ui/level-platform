'use client'

import { useState, useEffect } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { PageEnter } from '@/components/layout/PageEnter'
import { ProfileEditor, UserAvatar } from '@/components/profile/ProfileEditor'
import { Plus, Trash2, Edit2, X, Shield, User, Key, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UserRecord {
  id: string; email: string; name: string; role: 'admin' | 'member'; slug: string
  createdAt?: string; lastSignIn?: string; avatar_url?: string
}

function getCurrentUser() {
  if (typeof document === 'undefined') return null
  const cookie = document.cookie.split(';').find(c => c.trim().startsWith('byond_user='))
  if (!cookie) return null
  try { return JSON.parse(atob(cookie.trim().split('=').slice(1).join('='))) } catch { return null }
}

function UserFormModal({ initial, onSave, onClose }: {
  initial?: UserRecord; onSave: () => void; onClose: () => void
}) {
  const isEdit = !!initial
  const [name,     setName]     = useState(initial?.name     || '')
  const [email,    setEmail]    = useState(initial?.email    || '')
  const [role,     setRole]     = useState<'admin'|'member'>(initial?.role || 'member')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)

  async function handleSave() {
    if (!name.trim()) { setError('Nome obrigatório'); return }
    if (!isEdit && (!email.trim() || !password)) { setError('Email e senha obrigatórios'); return }
    if (password && password.length < 6) { setError('Senha deve ter ao menos 6 caracteres'); return }
    setSaving(true)
    const body: any = { name, role }
    if (isEdit) body.id = initial!.id
    else { body.email = email.trim(); body.password = password }
    if (isEdit && password) body.password = password

    const res = await fetch('/api/users', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await res.json()
    if (!res.ok) { setError(d.error || 'Erro ao salvar'); setSaving(false); return }
    onSave(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-black/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-black">{isEdit ? 'Editar usuário' : 'Novo usuário'}</h2>
            <button onClick={onClose} className="text-black/30 hover:text-black"><X className="w-5 h-5" /></button>
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          <div>
            <label className="text-black/40 text-xs mb-1 block">Nome *</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm focus:outline-none focus:border-black/30" />
          </div>
          {!isEdit && (
            <div>
              <label className="text-black/40 text-xs mb-1 block">Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm focus:outline-none focus:border-black/30" />
            </div>
          )}
          <div>
            <label className="text-black/40 text-xs mb-1 block">{isEdit ? 'Nova senha (opcional)' : 'Senha * (mín. 6 caracteres)'}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={isEdit ? '••••••' : 'mínimo 6 caracteres'}
              className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm focus:outline-none focus:border-black/30 tracking-widest placeholder:tracking-normal" />
          </div>
          <div>
            <label className="text-black/40 text-xs mb-1 block">Função</label>
            <div className="flex gap-2">
              {(['member', 'admin'] as const).map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${role === r ? 'bg-black text-white border-black' : 'bg-black/3 text-black/40 border-black/10'}`}>
                  {r === 'admin' ? '🛡 Admin' : '👤 Membro'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-black text-white font-medium rounded-xl py-2.5 text-sm hover:bg-black/90 disabled:opacity-50">
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar conta'}
            </button>
            <button onClick={onClose} className="px-4 bg-black/5 text-black rounded-xl py-2.5 text-sm">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const user = getCurrentUser()

  async function handleSave() {
    if (!current || !next) { setError('Preencha todos os campos'); return }
    if (next.length < 6) { setError('Nova senha deve ter ao menos 6 caracteres'); return }
    if (next !== confirm) { setError('Senhas não coincidem'); return }
    setSaving(true)
    const checkRes = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user?.email, password: current }),
    })
    if (!checkRes.ok) { setError('Senha atual incorreta'); setSaving(false); return }
    const res = await fetch('/api/users', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user?.id, password: next }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error); setSaving(false); return }
    setSuccess(true); setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-black/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-black">Alterar senha</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-black/30" /></button>
        </div>
        {success ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-green-500 font-medium">Senha alterada com sucesso!</p>
            <button onClick={onClose} className="px-6 py-2 bg-black text-white rounded-xl text-sm">Fechar</button>
          </div>
        ) : (
          <>
            {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
            {[
              { l: 'Senha atual', v: current, s: setCurrent },
              { l: 'Nova senha', v: next, s: setNext },
              { l: 'Confirmar nova senha', v: confirm, s: setConfirm },
            ].map(f => (
              <div key={f.l}>
                <label className="text-black/40 text-xs mb-1 block">{f.l}</label>
                <input type="password" value={f.v} onChange={e => f.s(e.target.value)}
                  className="w-full bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-black text-sm focus:outline-none focus:border-black/30 tracking-widest" />
              </div>
            ))}
            <button onClick={handleSave} disabled={saving}
              className="w-full bg-black text-white font-medium rounded-xl py-2.5 text-sm hover:bg-black/90 disabled:opacity-50">
              {saving ? '...' : 'Alterar senha'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ProfileModal({ user, onSaved, onClose, isAdminEdit }: { user: UserRecord; onSaved: (u: UserRecord) => void; onClose: () => void; isAdminEdit?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-black/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-black">Editar perfil</h2>
              {isAdminEdit && <p className="text-black/40 text-xs mt-0.5">Editando: {user.name}</p>}
            </div>
            <button onClick={onClose}><X className="w-5 h-5 text-black/30" /></button>
          </div>
          <ProfileEditor
            user={user}
            onSaved={u => onSaved(u as UserRecord)}
            onClose={onClose}
            targetUserId={isAdminEdit ? user.id : undefined}
          />
        </div>
      </div>
    </div>
  )
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const [users,        setUsers]        = useState<UserRecord[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editUser,     setEditUser]     = useState<UserRecord | null>(null)
  const [showPwd,      setShowPwd]      = useState(false)
  const [showProfile,  setShowProfile]  = useState(false)
  const [adminEditing, setAdminEditing] = useState<UserRecord | null>(null)
  const [currentUser,  setCurrentUser]  = useState<any>(null)
  const [isAdmin,      setIsAdmin]      = useState(false)

  function refreshCurrentUser() {
    const u = getCurrentUser()
    setCurrentUser(u)
    setIsAdmin(u?.role === 'admin')
  }

  useEffect(() => { refreshCurrentUser() }, [])

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/users')
    if (res.ok) { const d = await res.json(); setUsers(d.users || []) }
    setLoading(false)
  }

  useEffect(() => {
    if (isAdmin) loadUsers()
    else setLoading(false)
  }, [isAdmin])

  async function deleteUser(id: string) {
    if (!confirm('Excluir esta conta permanentemente?')) return
    await fetch('/api/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadUsers()
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  function handleProfileSaved(updated: any) {
    refreshCurrentUser()
    if (isAdmin) loadUsers()
  }

  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <main className="pt-14 p-8">
        <PageEnter>
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-semibold text-black tracking-tight">Configurações</h1>
              <p className="text-black/40 text-sm mt-0.5">Conta e administração</p>
            </div>

            {/* Minha conta */}
            <div className="bg-black/3 border border-black/8 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-black/40" />
                <h2 className="text-sm font-medium text-black/70 uppercase tracking-wider">Minha conta</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/8 flex items-center justify-center flex-shrink-0">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-black font-bold text-xl">
                      {currentUser?.name?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-black font-medium">{currentUser?.name || '...'}</p>
                  <p className="text-black/40 text-sm truncate">{currentUser?.email || ''}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${isAdmin ? 'bg-black text-white' : 'bg-black/8 text-black/50'}`}>
                    {isAdmin ? '🛡 Admin' : '👤 Membro'}
                  </span>
                </div>
                <button
                  onClick={() => setShowProfile(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-black/5 hover:bg-black/10 border border-black/10 rounded-xl text-black/50 text-sm transition-colors flex-shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowPwd(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/10 border border-black/10 rounded-xl text-black/60 text-sm transition-colors">
                  <Key className="w-3.5 h-3.5" /> Alterar senha
                </button>
                <button onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/10 border border-black/10 rounded-xl text-black/60 text-sm transition-colors">
                  <LogOut className="w-3.5 h-3.5" /> Sair
                </button>
              </div>
            </div>

            {/* Gerenciamento de usuários (admin only) */}
            {isAdmin && (
              <div className="bg-black/3 border border-black/8 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-black/40" />
                    <h2 className="text-sm font-medium text-black/70 uppercase tracking-wider">Usuários da equipe</h2>
                  </div>
                  <button onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-xl text-xs font-medium hover:bg-black/90 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center gap-3 bg-white border border-black/8 rounded-xl px-4 py-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-black/8 flex items-center justify-center flex-shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-black/50 font-medium text-sm">{u.name?.[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-black/80 text-sm font-medium">{u.name}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-black text-white' : 'bg-black/8 text-black/40'}`}>
                              {u.role === 'admin' ? 'Admin' : 'Membro'}
                            </span>
                            {u.id === currentUser?.id && <span className="text-xs text-black/25">(você)</span>}
                          </div>
                          <p className="text-black/35 text-xs truncate">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setAdminEditing(u)}
                            className="p-1.5 text-black/30 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                            title="Editar perfil"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditUser(u)}
                            className="p-1.5 text-black/30 hover:text-black hover:bg-black/5 rounded-lg transition-all"
                            title="Editar conta"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button onClick={() => deleteUser(u.id)}
                              className="p-1.5 text-black/30 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && <p className="text-black/30 text-sm text-center py-4">Nenhum usuário</p>}
                  </div>
                )}

                <div className="border-t border-black/8 pt-4">
                  <p className="text-black/25 text-xs">
                    🔒 Dados isolados por usuário no banco. Cada membro acessa apenas suas próprias demandas.
                  </p>
                </div>
              </div>
            )}

            {!isAdmin && (
              <div className="bg-black/3 border border-black/8 rounded-2xl p-6">
                <p className="text-black/40 text-sm">Para gerenciar acessos, contate o administrador.</p>
              </div>
            )}
          </div>
        </PageEnter>
      </main>

      {/* Modais */}
      {showProfile && currentUser && (
        <ProfileModal
          user={currentUser}
          onSaved={handleProfileSaved}
          onClose={() => setShowProfile(false)}
        />
      )}
      {adminEditing && (
        <ProfileModal
          user={adminEditing}
          isAdminEdit={adminEditing.id !== currentUser?.id}
          onSaved={() => { loadUsers(); setAdminEditing(null) }}
          onClose={() => setAdminEditing(null)}
        />
      )}
      {showForm && <UserFormModal onSave={loadUsers} onClose={() => setShowForm(false)} />}
      {editUser && <UserFormModal initial={editUser} onSave={loadUsers} onClose={() => setEditUser(null)} />}
      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
    </div>
  )
}
