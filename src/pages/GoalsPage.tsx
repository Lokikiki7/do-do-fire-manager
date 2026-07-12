/**
 * 목표 관리 — 단기/중기/장기 분류, 완료 체크.
 * 세그먼트 탭으로 기간을 필터링하고, 완료율을 표시한다.
 */
import { useState } from 'react';
import { Plus, Trash2, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppData } from '@/hooks/useAppData';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Card, Button, Input, Checkbox, SegmentedControl, EmptyState, cn } from '@/components/ui';
import { todayISO, uid } from '@/utils/format';
import type { GoalTerm } from '@/types';

const TERMS: { value: GoalTerm; label: string }[] = [
  { value: 'short', label: '단기' },
  { value: 'mid', label: '중기' },
  { value: 'long', label: '장기' },
];
const TERM_DESC: Record<GoalTerm, string> = {
  short: '1년 이내',
  mid: '1~5년',
  long: '5년 이상',
};

export function GoalsPage() {
  const { data, addGoal, updateGoal, removeGoal } = useAppData();
  const confirm = useConfirm();
  const [term, setTerm] = useState<GoalTerm>('short');
  const [title, setTitle] = useState('');

  const filtered = data.goals.filter((g) => g.term === term);
  const doneCount = filtered.filter((g) => g.done).length;

  const submit = () => {
    if (!title.trim()) return;
    addGoal({ id: uid(), term, title: title.trim(), done: false, createdAt: todayISO() });
    setTitle('');
  };

  const toggle = (id: string, done: boolean) =>
    updateGoal(id, { done: !done, doneAt: !done ? todayISO() : undefined });

  /** 삭제 전 확인 다이얼로그 */
  const handleRemove = async (id: string, title: string) => {
    if (
      await confirm({
        title: '목표를 삭제할까요?',
        message: `"${title}" 목표가 삭제됩니다. 되돌릴 수 없습니다.`,
        confirmLabel: '삭제',
        danger: true,
      })
    )
      removeGoal(id);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <SegmentedControl options={TERMS} value={term} onChange={setTerm} />
          <span className="text-sm text-ink-faint">
            {TERM_DESC[term]} · {doneCount}/{filtered.length} 완료
          </span>
        </div>

        {/* 입력 */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder={`${TERMS.find((t) => t.value === term)?.label} 목표 추가`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <Button onClick={submit} className="shrink-0">
            <Plus size={16} />
          </Button>
        </div>

        {/* 목록 */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Target size={32} />}
            title="목표가 없어요"
            desc={`${TERM_DESC[term]}에 이루고 싶은 목표를 추가해보세요.`}
          />
        ) : (
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {filtered.map((g) => (
                <motion.div
                  key={g.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 py-2.5 group"
                >
                  <Checkbox checked={g.done} onChange={() => toggle(g.id, g.done)} />
                  <span
                    className={cn(
                      'flex-1 transition-all',
                      g.done ? 'text-ink-faint line-through' : 'text-ink',
                    )}
                  >
                    {g.title}
                  </span>
                  <button
                    onClick={() => handleRemove(g.id, g.title)}
                    aria-label={`${g.title} 목표 삭제`}
                    className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-negative transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </div>
  );
}
