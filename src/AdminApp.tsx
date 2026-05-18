import { useEffect, useState, FormEvent } from 'react';
import { Building2, Users, ExternalLink, Plus, LayoutGrid, Menu, Moon, Sun, Activity, Edit2, KeyRound, Check, X, ShieldAlert, Upload } from 'lucide-react';
import { AuthUser, adminGetEmpresas, adminGetUsuarios, adminSaveEmpresa, adminSaveUsuario, adminTestConnection, adminUploadLogo, adminResetPassword } from './services/api';
import { Sidebar } from './components/Sidebar';
import { fmtInt } from './utils/format';

function sortByName(items: any[]) {
  return [...items].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' }));
}

export function AdminApp({ user, onImpersonate, onLogout }: { user: AuthUser, onImpersonate: (empresa: any) => void, onLogout: () => void }) {
  const initialSidebarOpen = typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1025px)').matches;
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'empresas' | 'usuarios'>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const navItems = (
    <>
      <a className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')} title="Dashboard">
        <LayoutGrid size={20} />
        <span>Dashboard</span>
      </a>
      <a className={activeTab === 'empresas' ? 'active' : ''} onClick={() => setActiveTab('empresas')} title="Empresas">
        <Building2 size={20} />
        <span>Empresas</span>
      </a>
      <a className={activeTab === 'usuarios' ? 'active' : ''} onClick={() => setActiveTab('usuarios')} title="Usuários">
        <Users size={20} />
        <span>Usuários</span>
      </a>
    </>
  );

  return (
    <div className={`app ${theme} ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      <Sidebar open={sidebarOpen} user={user} navItems={navItems} onClose={() => setSidebarOpen(false)} onLogout={onLogout} />
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <button className="icon-button" onClick={() => setSidebarOpen((value) => !value)} aria-label="Alternar menu">
              <Menu size={20} />
            </button>
            <img src="/logo_equilibrioti.png" alt="Equilíbrio TI" style={{ maxHeight: '40px', maxWidth: '200px', objectFit: 'contain' }} />
          </div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} aria-label="Alternar tema">
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </button>
          </div>
        </header>

        <main className="content">
          <section className="hero-strip">
            <div>
              <span className="eyebrow"><ShieldAlert size={15} /> Gestão da Plataforma</span>
              <h1>Painel do Administrador</h1>
            </div>
            <div className="status-pill"><Activity size={16} /> Multi-Tenant Ativo</div>
          </section>

          {activeTab === 'dashboard' && <AdminDashboard />}
          {activeTab === 'empresas' && <EmpresasList onImpersonate={onImpersonate} />}
          {activeTab === 'usuarios' && <UsuariosList />}
        </main>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminGetEmpresas(), adminGetUsuarios()]).then(([emps, usrs]) => {
      setEmpresas(emps);
      setUsuarios(usrs);
    }).finally(() => setLoading(false));
  }, []);

  const totalUsuariosAtivos = usuarios.filter(u => u.ativo).length;
  const usuariosPorEmpresa = empresas.map(emp => ({
    nome: emp.nome,
    total: usuarios.filter(u => u.empresa_id === emp.id).length
  })).sort((a, b) => b.total - a.total);

  if (loading) return <div className="tab-panel"><p>Carregando indicadores...</p></div>;

  return (
    <section className="tab-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow"><Activity size={15} /> Visão Geral</span>
          <h2>Indicadores da Plataforma</h2>
          <p>Métricas de utilização e clientes do Equilíbrio BI.</p>
        </div>
      </div>
      <div className="analysis-grid">
        <article className="mini-metric"><div><Building2 /></div><span>Empresas Ativas</span><strong>{fmtInt(empresas.length)}</strong></article>
        <article className="mini-metric"><div><Users /></div><span>Usuários Totais</span><strong>{fmtInt(usuarios.length)}</strong></article>
        <article className="mini-metric"><div><Check /></div><span>Usuários Ativos</span><strong>{fmtInt(totalUsuariosAtivos)}</strong></article>
      </div>

      <div className="charts-grid" style={{ marginTop: 24 }}>
        <article className="chart-card">
          <div className="chart-head">
            <strong>Usuários por Empresa</strong>
          </div>
          <div className="severity-bars">
            {usuariosPorEmpresa.map((item) => (
              <div key={item.nome}>
                <span>{item.nome}</span>
                <strong>{fmtInt(item.total)}</strong>
                <i style={{ width: `${Math.min(100, item.total / Math.max(1, usuariosPorEmpresa[0]?.total || 1) * 100)}%` }} />
              </div>
            ))}
            {usuariosPorEmpresa.length === 0 && <p className="empty-state">Sem dados de empresas.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}

function EmpresasList({ onImpersonate }: { onImpersonate: (empresa: any) => void }) {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEmpresa, setEditingEmpresa] = useState<any>(null);

  const load = () => {
    setLoading(true);
    adminGetEmpresas().then((items) => setEmpresas(sortByName(items))).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <section className="tab-panel">
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="eyebrow"><Building2 size={15} /> Cadastro</span>
          <h2>Empresas (Tenants)</h2>
          <p>Gerencie as empresas e suas conexões de banco de dados SQL Server.</p>
        </div>
        <button className="ghost-button apply-button" onClick={() => setEditingEmpresa({})}><Plus size={16} /> Nova Empresa</button>
      </div>

      <div className="table-card" style={{ overflowX: 'auto' }}>
        {loading ? <div style={{ padding: 20 }}>Carregando...</div> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Logo</th>
                <th>Conexão com o banco</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map(emp => (
                <tr key={emp.id}>
                  <td><strong>{emp.nome}</strong></td>
                  <td>
                    {emp.logo_url ? (
                      <img src={emp.logo_url} alt={emp.nome} style={{ height: 34, maxWidth: 160, objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#64748b' }}>Sem logo</span>
                    )}
                  </td>
                  <td>
                    <span
                      className="status-pill"
                      title={emp.db_connection_status || (emp.db_connected ? 'Conectado' : 'Não conectado')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        fontSize: 12,
                        background: emp.db_connected ? '#dcfce7' : '#fee2e2',
                        color: emp.db_connected ? '#166534' : '#991b1b',
                      }}
                    >
                      {emp.db_connected ? <Check size={14} /> : <X size={14} />}
                      {emp.db_connected ? 'Conectado' : 'Não conectado'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="icon-button" title="Editar" onClick={() => setEditingEmpresa(emp)}><Edit2 size={16} /></button>
                      <button className="ghost-button" title="Acessar painel como este cliente" onClick={() => onImpersonate(emp)}>
                        <ExternalLink size={16} /> Acessar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {empresas.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>Nenhuma empresa cadastrada.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      {editingEmpresa && <EmpresaFormModal empresa={editingEmpresa} onClose={() => setEditingEmpresa(null)} onSave={load} />}
    </section>
  );
}

function EmpresaFormModal({ empresa, onClose, onSave }: { empresa: any; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    nome: empresa.nome || '',
    logo_url: empresa.logo_url || '',
    db_host: empresa.db_host || '',
    db_port: empresa.db_port || '1433',
    db_database: empresa.db_database || '',
    db_user: empresa.db_user || '',
    db_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [testing, setTesting] = useState(false);
  const isNew = !empresa.id;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminSaveEmpresa(formData, empresa.id);
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setError('');
    setMessage('');
    setTesting(true);
    try {
      const res = await adminTestConnection(formData);
      setMessage(res.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await adminUploadLogo(file);
      setFormData({ ...formData, logo_url: res.url });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="password-modal" style={{ width: 500, maxWidth: '90vw' }} onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">{isNew ? 'Cadastro' : 'Edição'}</span>
            <h3>{isNew ? 'Nova Empresa' : 'Editar Empresa'}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}><X size={18} /></button>
        </header>

        <label>
          Nome da Empresa
          <input className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} type="text" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required />
        </label>

        <label>
          Logo (URL ou Upload)
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} type="text" value={formData.logo_url} onChange={e => setFormData({ ...formData, logo_url: e.target.value })} />
            <label className="ghost-button" style={{ margin: 0, padding: '0 16px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <Upload size={18} /> Upload
              <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleUpload} />
            </label>
          </div>
        </label>

        <div style={{ display: 'flex', gap: 16 }}>
          <label style={{ flex: 2 }}>
            Host do Banco (SQL Server)
            <input className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} type="text" value={formData.db_host} onChange={e => setFormData({ ...formData, db_host: e.target.value })} required />
          </label>
          <label style={{ flex: 1 }}>
            Porta
            <input className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} type="number" value={formData.db_port} onChange={e => setFormData({ ...formData, db_port: e.target.value })} required />
          </label>
        </div>

        <label>
          Nome do Banco de Dados
          <input className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} type="text" value={formData.db_database} onChange={e => setFormData({ ...formData, db_database: e.target.value })} required />
        </label>

        <div style={{ display: 'flex', gap: 16 }}>
          <label style={{ flex: 1 }}>
            Usuário do Banco
            <input className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} type="text" value={formData.db_user} onChange={e => setFormData({ ...formData, db_user: e.target.value })} required />
          </label>
          <label style={{ flex: 1 }}>
            Senha do Banco
            <input className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} type="password" value={formData.db_password} onChange={e => setFormData({ ...formData, db_password: e.target.value })} placeholder={isNew ? '' : '(Mantenha vazio para não alterar)'} required={isNew} />
          </label>
        </div>

        {error && <div className="login-error">{error}</div>}
        {message && <div className="login-success">{message}</div>}

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button type="button" className="ghost-button" onClick={handleTest} disabled={testing || !formData.db_host || !formData.db_user}>{testing ? 'Testando...' : 'Testar Conexão'}</button>
          <span style={{ flex: 1 }}></span>
          <button type="button" className="ghost-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="login-submit" style={{ width: 'auto', marginTop: 0 }} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Empresa'}</button>
        </div>
      </form>
    </div>
  );
}

function UsuariosList() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUsuario, setEditingUsuario] = useState<any>(null);
  const [resettingPasswordId, setResettingPasswordId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([adminGetUsuarios(), adminGetEmpresas()]).then(([usrs, emps]) => {
      setUsuarios(usrs);
      setEmpresas(emps);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <section className="tab-panel">
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="eyebrow"><Users size={15} /> Acessos</span>
          <h2>Usuários do Sistema</h2>
          <p>Gerencie o acesso à plataforma e vincule usuários às suas respectivas empresas.</p>
        </div>
        <button className="ghost-button apply-button" onClick={() => setEditingUsuario({})}><Plus size={16} /> Novo Usuário</button>
      </div>

      <div className="table-card" style={{ overflowX: 'auto' }}>
        {loading ? <div style={{ padding: 20 }}>Carregando...</div> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Empresa Vinculada</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.nome}</strong></td>
                  <td>{u.email}</td>
                  <td><span className="status-pill" style={{ display: 'inline-flex', padding: '4px 10px', fontSize: 11, background: u.perfil === 'admin' ? '#fef08a' : '#e0f2fe', color: u.perfil === 'admin' ? '#854d0e' : '#0369a1' }}>{u.perfil.toUpperCase()}</span></td>
                  <td>{u.empresa_nome || '-'}</td>
                  <td>{u.ativo ? <span style={{ color: '#16a34a' }}>Ativo</span> : <span style={{ color: '#dc2626' }}>Inativo</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="icon-button" title="Editar" onClick={() => setEditingUsuario(u)}><Edit2 size={16} /></button>
                      <button className="ghost-button" title="Resetar Senha" onClick={() => setResettingPasswordId(u.id)}><KeyRound size={16} /> Resetar Senha</button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>Nenhum usuário cadastrado.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      {editingUsuario && <UsuarioFormModal usuario={editingUsuario} empresas={empresas} onClose={() => setEditingUsuario(null)} onSave={load} />}
      {resettingPasswordId && <ResetPasswordModal userId={resettingPasswordId} onClose={() => setResettingPasswordId(null)} />}
    </section>
  );
}

function UsuarioFormModal({ usuario, empresas, onClose, onSave }: { usuario: any; empresas: any[]; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    nome: usuario.nome || '',
    email: usuario.email || '',
    senha: '',
    perfil: usuario.perfil || 'cliente',
    empresa_id: usuario.empresa_id || '',
    ativo: usuario.ativo !== false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isNew = !usuario.id;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...formData, empresa_id: formData.empresa_id ? Number(formData.empresa_id) : null };
      await adminSaveUsuario(payload, usuario.id);
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="password-modal" style={{ width: 450, maxWidth: '90vw' }} onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">{isNew ? 'Cadastro' : 'Edição'}</span>
            <h3>{isNew ? 'Novo Usuário' : 'Editar Usuário'}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}><X size={18} /></button>
        </header>

        <label>
          Nome
          <input className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} type="text" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required />
        </label>

        <label>
          E-mail
          <input className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
        </label>

        {isNew && (
          <label>
            Senha Inicial
            <input className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} type="password" value={formData.senha} onChange={e => setFormData({ ...formData, senha: e.target.value })} minLength={6} required />
          </label>
        )}

        <div style={{ display: 'flex', gap: 16 }}>
          <label style={{ flex: 1 }}>
            Perfil
            <select className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }} value={formData.perfil} onChange={e => setFormData({ ...formData, perfil: e.target.value })} required>
              <option value="cliente">Cliente</option>
              <option value="admin">Administrador</option>
            </select>
          </label>

          <label style={{ flex: 1 }}>
            Status
            <select className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }} value={formData.ativo ? 'true' : 'false'} onChange={e => setFormData({ ...formData, ativo: e.target.value === 'true' })} required>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </label>
        </div>

        {formData.perfil !== 'admin' && (
          <label>
            Empresa Vinculada
            <select className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }} value={formData.empresa_id} onChange={e => setFormData({ ...formData, empresa_id: e.target.value })} required>
              <option value="">Selecione a empresa...</option>
              {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
            </select>
          </label>
        )}

        {error && <div className="login-error">{error}</div>}

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <span style={{ flex: 1 }}></span>
          <button type="button" className="ghost-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="login-submit" style={{ width: 'auto', marginTop: 0 }} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Usuário'}</button>
        </div>
      </form>
    </div>
  );
}

function ResetPasswordModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await adminResetPassword(userId, novaSenha);
      setMessage(res.message || 'Senha redefinida com sucesso.');
      setTimeout(onClose, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="password-modal" onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">Segurança</span>
            <h3>Redefinir Senha do Usuário</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}><X size={18} /></button>
        </header>

        <label>
          Nova Senha
          <input className="login-input" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} minLength={6} required />
        </label>

        {error && <div className="login-error">{error}</div>}
        {message && <div className="login-success">{message}</div>}

        <button type="submit" className="login-submit" disabled={loading}>{loading ? 'Aguarde...' : 'Confirmar Redefinição'}</button>
      </form>
    </div>
  );
}
