import { useTranslation } from '../i18n';
import { useState } from 'react';
import { Eye,EyeOff } from 'lucide-react';
import { authenticateDemo } from '../services/demo';
export default function LoginPage({onLogin}:{onLogin:()=>void}){
 const {t}=useTranslation();
 const [user,setUser]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false),[error,setError]=useState('');
 const login=()=>{if(authenticateDemo(user,password)){setPassword('');onLogin()}else setError('用户名或密码错误，请使用下方演示账号')};
 return <main className="login-page"><aside className="login-brand"><small>KL–GeoBank</small><h1>{t("物探数据银行")}</h1><p>{t("面向地震勘探数据的统一管理、共享、应用平台。")}</p><svg viewBox="0 0 960 620" aria-hidden="true">{Array.from({length:7},(_,i)=><path key={i} d={`M-40 ${360+i*36} Q220 ${140+i*36} 500 ${270+i*36} T1000 ${160+i*36}`}/>)}</svg><strong>{t("深耕数据价值 赋能智慧勘探")}</strong><footer>{t("中国石油集团东方地球物理勘探有限责任公司")}</footer></aside><section className="login-side"><form onSubmit={e=>{e.preventDefault();login()}}><h2>{t("欢迎登录")}</h2><p>{t("请使用示例账号登录物探数据银行")}</p>{error&&<div className="login-error" role="alert">{t(error)}</div>}<label className="field">{t("用户名")}<input aria-label={t("用户名")} placeholder={t("请输入用户名")} autoComplete="off" value={user} onChange={e=>setUser(e.target.value)}/></label><label className="field">{t("密码")}<div className="password-field"><input aria-label={t("密码")} type={visible?'text':'password'} placeholder={t("请输入密码")} autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="icon-button" aria-label={t(visible?'隐藏密码':'显示密码')} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={22}/>:<Eye size={22}/>}</button></div></label><button type="submit" className="button primary login-submit">{t("登录")}</button><div className="login-demo">{t("离线演示账号：Demo / demo123")}<small>{t("仅用于交互演示，不连接真实账户。")}</small></div></form></section></main>
}
