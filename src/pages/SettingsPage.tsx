/**
 * 설정 — 프로필, 목표 금액, 기본 수익률, 통화, 테마 + 데이터 백업/복원.
 */
import { useRef, useState } from 'react';
import { Download, Upload, RotateCcw, Check, AlertTriangle } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  Card,
  SectionTitle,
  Field,
  Input,
  Select,
  Button,
  SegmentedControl,
} from '@/components/ui';
import { exportBackup, importBackup } from '@/utils/storage';
import { parseAmount } from '@/utils/validate';
import { DEFAULT_DATA } from '@/constants';
import { CloudSyncCard } from '@/components/settings/CloudSyncCard';
import type { User } from '@supabase/supabase-js';
import type { ThemeMode, Currency } from '@/types';

const THEME_OPTS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
  { value: 'system', label: '시스템' },
];

export function SettingsPage({ user }: { user: User | null }) {
  const { data, updateSettings, replaceAll } = useAppData();
  const confirm = useConfirm();
  const { settings } = data;
  const fileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const onImport = async (file: File) => {
    const parsed = await importBackup(file);
    if (parsed) {
      replaceAll(parsed);
      notify('백업을 복원했어요');
    } else notify('올바르지 않은 백업 파일입니다', false);
  };

  const onReset = async () => {
    if (
      await confirm({
        title: '모든 데이터를 초기화할까요?',
        message:
          '자산·기록·목표·로드맵이 모두 삭제되고 기본 상태로 돌아갑니다. 되돌릴 수 없습니다.',
        confirmLabel: '초기화',
        danger: true,
      })
    ) {
      replaceAll(structuredClone(DEFAULT_DATA));
      notify('초기화했어요');
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* 클라우드 동기화 */}
      <CloudSyncCard user={user} />

      {/* 프로필 */}
      <Card>
        <SectionTitle>프로필</SectionTitle>
        <div className="space-y-4">
          <Field label="이름">
            <Input
              value={settings.name}
              placeholder="이름을 입력하세요"
              onChange={(e) => updateSettings({ name: e.target.value })}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="초기 자산" hint="현재 보유 중인 자산">
              <Input
                type="number"
                inputMode="numeric"
                value={settings.initialAsset}
                onChange={(e) => updateSettings({ initialAsset: parseAmount(e.target.value) })}
              />
            </Field>
            <Field label="초기 부채" hint="현재 있는 빚">
              <Input
                type="number"
                inputMode="numeric"
                value={settings.initialLiability}
                onChange={(e) => updateSettings({ initialLiability: parseAmount(e.target.value) })}
              />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="FIRE 목표 금액" hint="비워두면 4% 룰 자동 계산값 사용">
              <Input
                type="number"
                inputMode="numeric"
                value={settings.fireTarget}
                onChange={(e) => updateSettings({ fireTarget: parseAmount(e.target.value) })}
              />
            </Field>
            <Field label="연간 지출">
              <Input
                type="number"
                inputMode="numeric"
                value={settings.annualExpense}
                onChange={(e) => updateSettings({ annualExpense: parseAmount(e.target.value) })}
              />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={`기본 연 수익률 (${settings.defaultReturnRate}%)`}>
              <input
                type="range"
                min={1}
                max={15}
                step={0.5}
                value={settings.defaultReturnRate}
                onChange={(e) => updateSettings({ defaultReturnRate: Number(e.target.value) })}
                className="w-full accent-accent"
              />
            </Field>
            <Field label="통화">
              <Select
                value={settings.currency}
                onChange={(e) => updateSettings({ currency: e.target.value as Currency })}
              >
                <option value="KRW">원화 (₩)</option>
                <option value="USD">달러 ($)</option>
              </Select>
            </Field>
          </div>
          <Field
            label={`예상 물가상승률 (${settings.inflationRate}%)`}
            hint="실질 수익률과 미래 자산의 현재가치 계산에 사용됩니다"
          >
            <input
              type="range"
              min={0}
              max={8}
              step={0.5}
              value={settings.inflationRate}
              onChange={(e) => updateSettings({ inflationRate: Number(e.target.value) })}
              className="w-full accent-negative"
            />
          </Field>
        </div>
      </Card>

      {/* 테마 */}
      <Card>
        <SectionTitle>화면</SectionTitle>
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-soft">테마 모드</span>
          <SegmentedControl
            options={THEME_OPTS}
            value={settings.theme}
            onChange={(t) => updateSettings({ theme: t })}
          />
        </div>
      </Card>

      {/* 데이터 */}
      <Card>
        <SectionTitle>데이터 관리</SectionTitle>
        <p className="text-sm text-ink-soft mb-4">
          데이터는 이 기기에 저장되고, 로그인 시 클라우드에도 자동 동기화됩니다. 추가 안전장치로 JSON 백업을 내보낼 수 있어요.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => exportBackup(data)}>
            <Download size={16} /> JSON 백업
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> JSON 복원
          </Button>
          <Button variant="danger" onClick={onReset}>
            <RotateCcw size={16} /> 초기화
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
        </div>
      </Card>

      {/* 토스트 */}
      {toast && (
        <div
          className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-positive' : 'bg-negative'}`}
        >
          {toast.ok ? <Check size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
