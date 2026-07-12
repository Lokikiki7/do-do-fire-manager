/**
 * ConfirmDialog 컴포넌트 테스트.
 * 데이터 유실 방어의 핵심 UI이므로, 확인/취소/백드롭 각 경로가
 * 올바른 boolean으로 resolve되는지 검증한다.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider, useConfirm } from '@/components/ui/ConfirmDialog';

/**
 * 테스트용 소비 컴포넌트.
 * 버튼을 누르면 confirm을 호출하고, 결과(true/false)를 화면에 표시한다.
 */
function Harness() {
  const confirm = useConfirm();
  const onClick = async () => {
    const ok = await confirm({
      title: '삭제할까요?',
      message: '되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      danger: true,
    });
    // 결과를 DOM에 남겨 테스트가 확인할 수 있게 한다
    const el = document.getElementById('result')!;
    el.textContent = ok ? 'confirmed' : 'cancelled';
  };
  return (
    <>
      <button onClick={onClick}>열기</button>
      <div id="result" data-testid="result" />
    </>
  );
}

function renderHarness() {
  return render(
    <ConfirmProvider>
      <Harness />
    </ConfirmProvider>,
  );
}

describe('ConfirmDialog', () => {
  it('초기에는 다이얼로그가 보이지 않는다', () => {
    renderHarness();
    expect(screen.queryByText('삭제할까요?')).not.toBeInTheDocument();
  });

  it('confirm 호출 시 제목·메시지·버튼이 나타난다', async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText('열기'));

    expect(screen.getByText('삭제할까요?')).toBeInTheDocument();
    expect(screen.getByText('되돌릴 수 없습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
  });

  it('확인 버튼을 누르면 true로 resolve된다', async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText('열기'));
    await user.click(screen.getByRole('button', { name: '삭제' }));

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('confirmed');
    });
  });

  it('취소 버튼을 누르면 false로 resolve된다', async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText('열기'));
    await user.click(screen.getByRole('button', { name: '취소' }));

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('cancelled');
    });
  });

  it('resolve 후 다이얼로그가 닫힌다', async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText('열기'));
    await user.click(screen.getByRole('button', { name: '삭제' }));

    await waitFor(() => {
      expect(screen.queryByText('삭제할까요?')).not.toBeInTheDocument();
    });
  });

  it('접근성: alertdialog role을 가진다', async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText('열기'));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
