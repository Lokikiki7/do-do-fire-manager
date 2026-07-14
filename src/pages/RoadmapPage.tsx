/**
 * 인생 로드맵 — 연도순 마일스톤 타임라인.
 * 체크로 완료 처리하며, 완료 시 진행률과 시각적 상태가 바뀐다.
 */
import { useState } from 'react';
import { Plus, Trash2, Map, Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppData } from '@/hooks/useAppData';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  Card,
  SectionTitle,
  Button,
  Field,
  Input,
  Checkbox,
  EmptyState,
  cn,
} from '@/components/ui';
import { todayISO, uid, formatMoney } from '@/utils/format';
import { parseYear, parseAmount } from '@/utils/validate';

export function RoadmapPage() {
  const { data, addMilestone, updateMilestone, removeMilestone } = useAppData();
  const confirm = useConfirm();
  const [showAdd, setShowAdd] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const milestones = data.milestones; // 훅에서 이미 연도순 정렬됨
  const doneCount = milestones.filter((m) => m.done).length;
  const progress = milestones.length ? (doneCount / milestones.length) * 100 : 0;

  const submit = () => {
    if (!title.trim()) return;
    addMilestone({
      id: uid(),
      year: parseYear(year),
      title: title.trim(),
      targetAmount: amount.trim() ? parseAmount(amount) : undefined,
      done: false,
    });
    setTitle('');
    setAmount('');
    setShowAdd(false);
  };

  const toggle = (id: string, done: boolean) =>
    updateMilestone(id, { done: !done, doneAt: !done ? todayISO() : undefined });

  const submitEdit = (id: string) => {
    if (editAmount.trim()) {
      updateMilestone(id, { targetAmount: parseAmount(editAmount) });
    }
    setEditId(null);
    setEditAmount('');
  };

  /** 삭제 전 확인 다이얼로그 */
  const handleRemove = async (id: string, title: string) => {
    if (
      await confirm({
        title: '마일스톤을 삭제할까요?',
        message: `"${title}" 항목이 로드맵에서 제거됩니다. 되돌릴 수 없습니다.`,
        confirmLabel: '삭제',
        danger: true,
      })
    )
      removeMilestone(id);
  };

  return (
    <div className="space-y-4">
      {/* 진행 요약 */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-ink-soft">전체 진행률</p>
            <p className="text-2xl font-bold tabular">
              {doneCount} / {milestones.length} 완료
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
            <Plus size={15} /> 추가
          </Button>
        </div>
        <div className="h-2.5 bg-line/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-gold to-negative rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </div>

        {showAdd && (
          <div className="grid sm:grid-cols-[110px_1fr_120px_auto] gap-3 mt-4 p-3 bg-canvas dark:bg-elevated rounded-xl">
            <Field label="연도">
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </Field>
            <Field label="목표">
              <Input
                placeholder="예: 1억 달성"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </Field>
            <Field label="목표 금액" hint="선택사항">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </Field>
            <div className="flex items-end">
              <Button onClick={submit}>추가</Button>
            </div>
          </div>
        )}
      </Card>

      {/* 타임라인 */}
      <Card>
        <SectionTitle>인생 타임라인</SectionTitle>
        {milestones.length === 0 ? (
          <EmptyState
            icon={<Map size={32} />}
            title="로드맵이 비어있어요"
            desc="유럽여행, 1억 달성처럼 이루고 싶은 목표를 연도별로 추가해보세요."
          />
        ) : (
          <div className="relative pl-2">
            {/* 세로 라인 */}
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-line/10" />
            <div className="space-y-1">
              {milestones.map((ms, i) => (
                <motion.div
                  key={ms.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative flex items-center gap-3 py-2.5 group"
                >
                  {/* 노드 */}
                  <div
                    className={cn(
                      'relative z-10 w-7 h-7 rounded-full grid place-items-center shrink-0 border-2 bg-surface',
                      ms.done ? 'border-positive' : 'border-line/20',
                    )}
                  >
                    {ms.done ? (
                      <div className="w-3 h-3 rounded-full bg-positive" />
                    ) : (
                      <Flag size={13} className="text-ink-faint" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold tabular w-12',
                      ms.done ? 'text-ink-faint' : 'text-accent',
                    )}
                  >
                    {ms.year}
             