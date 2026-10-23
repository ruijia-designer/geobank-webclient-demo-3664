import { memo, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Info, LockKeyhole, UserRound } from 'lucide-react';
import { useTranslation } from '../i18n';
import { authenticateDemo } from '../services/demo';
import './LoginPage.css';

// Synthetic seismic traces and interpreted horizons, used only as an illustrative diagram.
// No project measurements or inferred geological results are displayed.
const SeismicSection = memo(function SeismicSection({ label }: { label: string }) {
  const horizonDepth = (x: number, layer: number) =>
    70 + layer * 62 + 9 * Math.sin(x / 155 + layer * 0.16)
    - (12 + layer * 9) * Math.exp(-((x - 460) ** 2) / 42000)
    + (x > 646 ? 18 : 0);
  const traces = Array.from({ length: 45 }, (_, trace) => {
    const center = 48 + trace * 20;
    const samples = Array.from({ length: 110 }, (_, sample) => {
      const y = 35 + sample * 1.9;
      const amplitude = [0, 1, 2].reduce((sum, layer) => {
        const t = (y - horizonDepth(center, layer)) / 5.4;
        return sum + (1 - 2 * t * t) * Math.exp(-t * t) * (layer === 1 ? 9.5 : 7.5);
      }, 0) + Math.sin(y * 0.36 + trace * 0.45) * 0.6;
      return { y, amplitude };
    });
    const line = samples.map(({ y, amplitude }, i) =>
      `${i ? 'L' : 'M'}${(center + amplitude).toFixed(2)},${y.toFixed(1)}`).join(' ');
    const positive = `M${center},35 ` + samples.map(({ y, amplitude }) =>
      `L${(center + Math.max(0, amplitude)).toFixed(2)},${y.toFixed(1)}`).join(' ')
      + `L${center},242.1 Z`;
    return <g key={trace}><path d={positive} fill="#8ca9d0" opacity=".26" /><path d={line} stroke="#8ca9d0" strokeWidth=".85" opacity=".44" /></g>;
  });
  const horizons = [0, 1, 2].flatMap(layer => [[48, 640], [656, 928]].map(([start, end], segment) => {
    const path = Array.from({ length: 75 }, (_, i) => {
      const x = start + (end - start) * i / 74;
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${horizonDepth(x, layer).toFixed(1)}`;
    }).join(' ');
    return <path key={`${layer}-${segment}`} d={path} stroke={layer === 1 ? '#84beff' : '#658cbd'} strokeWidth={layer === 1 ? 1.6 : 1.1} opacity={layer === 1 ? .8 : .65} />;
  }));
  return <figure className="geophysics-visual" aria-label={label}>
    <svg className="seismic-section" viewBox="0 0 976 268" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <linearGradient id="traceFade" x1="0" y1="0" x2="0" y2="1"><stop stopColor="white" stopOpacity=".25" /><stop offset=".2" stopColor="white" /><stop offset=".82" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient>
        <mask id="traceMask"><rect x="40" y="30" width="900" height="220" fill="url(#traceFade)" /></mask>
      </defs>
      <path d="M48 17H928 M920 13L928 17L920 21 M27 38V235 M23 228L27 236L31 228" stroke="#7093c0" strokeWidth="1" opacity=".4" />
      {Array.from({ length: 23 }, (_, i) => <path key={i} d={`M${48 + i * 40} 12V22`} stroke="#8aaddb" strokeWidth="1" opacity=".52" />)}
      <g mask="url(#traceMask)">{traces}{horizons}<path d="M633 40L665 224" stroke="#acc7ec" strokeWidth="1.1" strokeDasharray="4 6" opacity=".6" /></g>
    </svg>
  </figure>;
});

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const { t } = useTranslation();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // The workspace keeps its desktop minimum width; the login page is responsive.
    document.body.classList.add('geobank-login-active');
    return () => document.body.classList.remove('geobank-login-active');
  }, []);

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authenticateDemo(user, password)) {
      setPassword('');
      onLogin();
    } else {
      setError('用户名或密码错误，请使用下方演示账号');
    }
  }

  return (
    <main className="geobank-login">
      <section className="brand-panel" aria-label={t('物探数据银行介绍')}>
        <header className="brand-header">
          <img className="brand-symbol" src="./assets/logo.png" alt={t('中国石油')} width={56} height={56} />
          <div className="brand-lockup"><span className="brand-name">KL-GeoBank</span></div>
        </header>
        <div className="brand-content">
          <h1 className="brand-title">{t('物探数据银行')}</h1>
          <p className="brand-description">{t('面向地震勘探数据的统一管理、共享、应用平台。')}</p>
        </div>
        <SeismicSection label={t('物探示意：合成地震记录、层位解释与断层')} />
        <p className="brand-slogan">{t('深耕数据价值　赋能智慧勘探')}</p>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-content">
          <div className="login-heading">
            <span className="heading-rule" aria-hidden="true" />
            <h2 id="login-title">{t('欢迎登录')}</h2>
            <p>{t('请输入您的账号信息以访问系统')}</p>
          </div>
          <form onSubmit={login} noValidate>
            <div className="field-group">
              <label htmlFor="login-username">{t('用户名')}</label>
              <div className="input-wrap">
                <UserRound size={18} strokeWidth={1.5} className="input-icon" aria-hidden="true" />
                <input id="login-username" name="username" autoComplete="username" value={user}
                  onChange={event => { setUser(event.target.value); setError(''); }}
                  aria-invalid={Boolean(error)} aria-describedby={error ? 'login-error login-demo' : 'login-demo'} required />
              </div>
            </div>
            <div className="field-group password-group">
              <label htmlFor="login-password">{t('密码')}</label>
              <div className="input-wrap">
                <LockKeyhole size={18} strokeWidth={1.5} className="input-icon" aria-hidden="true" />
                <input id="login-password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" value={password}
                  onChange={event => { setPassword(event.target.value); setError(''); }}
                  aria-invalid={Boolean(error)} aria-describedby={error ? 'login-error login-demo' : 'login-demo'} required />
                <button type="button" className="password-toggle" aria-label={t(visible ? '隐藏密码' : '显示密码')}
                  aria-pressed={visible} onClick={() => setVisible(current => !current)}>
                  {visible ? <EyeOff size={18} strokeWidth={1.5} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.5} aria-hidden="true" />}
                </button>
              </div>
            </div>
            <button type="submit" className="login-button"><span>{t('登录系统')}</span><ArrowRight size={18} strokeWidth={1.6} aria-hidden="true" /></button>
            <div className="notice-area">
              {error && <p id="login-error" className="form-notice" role="alert"><Info size={16} aria-hidden="true" /><span>{t(error)}</span></p>}
            </div>
            <div id="login-demo" className="demo-hint">
              {t('离线演示账号：Demo / demo123')}
              <small>{t('仅用于交互演示，不连接真实账户。')}</small>
            </div>
          </form>
          <p className="company-signature">{t('中国石油集团东方地球物理勘探有限责任公司')}</p>
        </div>
      </section>
    </main>
  );
}
