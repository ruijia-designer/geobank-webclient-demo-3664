import { useId } from 'react';
import { useTranslation } from '../i18n';
import './ResultsAccessEmptyState.css';

export function ResultsAccessEmptyState() {
  const { t } = useTranslation();
  const id = useId();

  return <main className="results-access-empty">
    <div className="results-access-empty-content">
      <svg className="results-access-empty-illustration" viewBox="0 0 280 220" width="280" height="220"
        fill="none" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={`${id}-halo`}>
            <stop stopColor="#e2f1f6"/>
            <stop offset="1" stopColor="#e2f1f6" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id={`${id}-top`} x1="74" y1="58" x2="154" y2="110" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ecf8fb"/>
            <stop offset="1" stopColor="#c6e5ef"/>
          </linearGradient>
          <linearGradient id={`${id}-left`} x1="59" y1="95" x2="119" y2="173" gradientUnits="userSpaceOnUse">
            <stop stopColor="#d6edf4"/>
            <stop offset="1" stopColor="#b5dae8"/>
          </linearGradient>
          <linearGradient id={`${id}-right`} x1="165" y1="86" x2="114" y2="176" gradientUnits="userSpaceOnUse">
            <stop stopColor="#b4dce9"/>
            <stop offset="1" stopColor="#88bed3"/>
          </linearGradient>
          <linearGradient id={`${id}-shield`} x1="154" y1="99" x2="213" y2="183" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f4fbfd"/>
            <stop offset="1" stopColor="#d6ebf2"/>
          </linearGradient>
        </defs>

        <ellipse cx="140" cy="119" rx="133" ry="99" fill={`url(#${id}-halo)`}/>
        <ellipse cx="141" cy="190" rx="76" ry="9" fill="#dceaf0" opacity=".48"/>
        <ellipse cx="139" cy="121" rx="115" ry="47" transform="rotate(-17 139 121)"
          stroke="#c2dce6" strokeWidth="1.2"/>
        <path d="M48 48v12m-6-6h12M238 81v8m-4-4h8" stroke="#bdd7e1" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="42" cy="132" r="4" fill="#f4f8fa" stroke="#8fbdce" strokeWidth="1.5"/>
        <circle cx="235" cy="107" r="3" fill="#9fc8d8"/>

        <g stroke="#83b5c9" strokeWidth="1.2" strokeLinejoin="round">
          <path d="m113 52 55 32-55 32-55-32 55-32Z" fill={`url(#${id}-top)`}/>
          <path d="m58 84 55 32v62l-55-32V84Z" fill={`url(#${id}-left)`}/>
          <path d="m113 116 55-32v62l-55 32v-62Z" fill={`url(#${id}-right)`}/>
          <path d="m76 74 55 32m-36-43 55 32M76 95v61m19-50v61m36-61v61m19-72v61"
            stroke="#f3fbfd" strokeOpacity=".8"/>
          <path d="m58 105 55 32 55-32m-110 21 55 32 55-32" stroke="#e9f7fb" strokeOpacity=".82"/>
        </g>

        <g stroke="#a4cad9" strokeWidth="1.1" strokeLinejoin="round">
          <path d="m201 38 15 9-15 9-15-9 15-9Z" fill="#edf8fb"/>
          <path d="m186 47 15 9v17l-15-9V47Z" fill="#dceff5"/>
          <path d="m201 56 15-9v17l-15 9V56Z" fill="#c8e3ed"/>
          <path d="M201 79v10" strokeDasharray="2 4" strokeLinecap="round"/>
        </g>

        <path d="M31 149c18 23 78 24 137 7 29-8 53-19 69-32"
          stroke="#b7d6e2" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="71" cy="164" r="3.5" fill="#9bc7d8" stroke="#f4f8fa" strokeWidth="2"/>

        <path d="m184 92 35 13v31c0 22-15 39-35 50-20-11-35-28-35-50v-31l35-13Z"
          fill={`url(#${id}-shield)`} stroke="#75aabf" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="m184 100 27 10v26c0 17-11 31-27 41-16-10-27-24-27-41v-26l27-10Z"
          stroke="#b7d9e5" strokeWidth="1.1" strokeLinejoin="round"/>
        <path d="M176 132v-6a8 8 0 0 1 16 0v6" stroke="#528fa9" strokeWidth="2" strokeLinecap="round"/>
        <rect x="171" y="131" width="26" height="23" rx="5" fill="#eaf6fa" stroke="#528fa9" strokeWidth="1.7"/>
        <circle cx="184" cy="141" r="2.5" fill="#528fa9"/>
        <path d="M184 143v4" stroke="#528fa9" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <p className="results-access-empty-message">{t('您无任何可查阅的项目，请联系系统管理员。')}</p>
    </div>
  </main>;
}
