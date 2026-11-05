import { useEffect, useRef } from 'react';
import { createApp, h, shallowReactive } from 'vue';
import { ElColorPicker } from 'element-plus/es/components/color-picker/index.mjs';
import { ElConfigProvider } from 'element-plus/es/components/config-provider/index.mjs';
import zhCn from 'element-plus/es/locale/lang/zh-cn.mjs';
import en from 'element-plus/es/locale/lang/en.mjs';
import 'element-plus/es/components/color-picker/style/css.mjs';
import { useTranslation } from '../i18n';

type Props = { name: string; value: string; onSave: (color: string) => void };

// Keep the Vue component isolated from React, including its teleported popup.
// The whole adapter is lazy-loaded by the project types page.
export default function ProjectTypeColorPicker({ name, value, onSave }: Props) {
    const { t, locale } = useTranslation();
    const hostRef = useRef<HTMLDivElement>(null);
    const current = useRef({ value, label: t('修改{name}颜色', { name }), locale, onSave });
    current.current = { value, label: t('修改{name}颜色', { name }), locale, onSave };
    const syncRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const state = shallowReactive({ ...current.current });
        const app = createApp({
            setup: () => () => h(ElConfigProvider, { locale: state.locale === 'en' ? en : zhCn }, {
                default: () => h(ElColorPicker, {
                    modelValue: state.value,
                    ariaLabel: state.label,
                    colorFormat: 'hex',
                    clearable: false,
                    persistent: false,
                    validateEvent: false,
                    popperClass: 'project-type-color-popup',
                    onChange: (color: string | null | undefined) => {
                        // Element's change event fires on confirmation, not during preview.
                        if (color && /^#[0-9a-f]{6}$/i.test(color)) current.current.onSave(color.toUpperCase());
                    },
                }),
            }),
        });
        app.mount(host);
        syncRef.current = () => Object.assign(state, current.current);
        return () => {
            syncRef.current = null;
            app.unmount();
        };
    }, []);

    useEffect(() => { syncRef.current?.(); });

    return <div className="project-type-color">
        <div ref={hostRef}/>
        <span className="project-type-color-code">{value}</span>
    </div>;
}
