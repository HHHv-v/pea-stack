import { useEffect, useRef, useState } from 'react';
import { ACCS, type AccId, BEANS, type BeanId, isOwned, itemKey } from './game/cosmetics';
import { drawPea } from './game/draw';

interface Props {
  coins: number;
  owned: string[];
  bean: BeanId;
  acc: AccId;
  onBuy: (kind: 'bean' | 'acc', id: string, price: number) => void;
  onEquip: (kind: 'bean' | 'acc', id: string) => void;
  onClose: () => void;
}

type Tab = 'bean' | 'acc';

/** 완두콩을 크게 그려 보여주는 캔버스 */
export function PeaPreview({ bean, acc, size, mood = 'calm' }: { bean: BeanId; acc: AccId; size: number; mood?: 'calm' | 'happy' }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const k = (size / 64) * dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, 64, 64);
    drawPea(ctx, 32, 54, mood, false, { bean, acc });
  }, [bean, acc, size, mood]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden="true" />;
}

export function Coin({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="coin-icon">
      <circle cx="10" cy="10" r="8.5" fill="#FFD54A" stroke="#C9921A" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="4.2" fill="#A9E28B" stroke="#6DB658" strokeWidth="1.2" />
    </svg>
  );
}

export default function Shop({ coins, owned, bean, acc, onBuy, onEquip, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('bean');
  const [pick, setPick] = useState<{ kind: Tab; id: string }>({ kind: 'bean', id: bean });

  const items = tab === 'bean' ? BEANS : ACCS;
  const previewBean = (pick.kind === 'bean' ? pick.id : bean) as BeanId;
  const previewAcc = (pick.kind === 'acc' ? pick.id : acc) as AccId;
  const picked = (pick.kind === 'bean' ? BEANS : ACCS).find((i) => i.id === pick.id)!;
  const pickedOwned = isOwned(owned, pick.kind, pick.id, picked.price);
  const equipped = pick.kind === 'bean' ? bean === pick.id : acc === pick.id;

  let action: { label: string; disabled: boolean; run?: () => void };
  if (equipped) action = { label: '착용 중', disabled: true };
  else if (pickedOwned) action = { label: '착용하기', disabled: false, run: () => onEquip(pick.kind, pick.id) };
  else if (coins >= picked.price)
    action = { label: `${picked.price} 코인으로 사기`, disabled: false, run: () => onBuy(pick.kind, pick.id, picked.price) };
  else action = { label: `코인이 ${picked.price - coins}개 모자라요`, disabled: true };

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="shop-title">
      <div className="card shop">
        <div className="shop-head">
          <h3 id="shop-title">완두콩 꾸미기</h3>
          <span className="chip coin-chip">
            <Coin /> {coins}
          </span>
        </div>

        <div className="shop-preview">
          <PeaPreview bean={previewBean} acc={previewAcc} size={120} mood="happy" />
          <b>{picked.name}</b>
        </div>

        <div className="tabs" role="tablist">
          {(['bean', 'acc'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? 'tab on' : 'tab'}
              onClick={() => {
                setTab(t);
                setPick({ kind: t, id: t === 'bean' ? bean : acc });
              }}
            >
              {t === 'bean' ? '콩' : '소품'}
            </button>
          ))}
        </div>

        <div className="grid">
          {items.map((it) => {
            const own = isOwned(owned, tab, it.id, it.price);
            const on = tab === 'bean' ? bean === it.id : acc === it.id;
            const sel = pick.kind === tab && pick.id === it.id;
            return (
              <button
                key={itemKey(tab, it.id)}
                type="button"
                className={['item', sel ? 'sel' : '', on ? 'on' : ''].join(' ')}
                onClick={() => setPick({ kind: tab, id: it.id })}
                aria-label={`${it.name}${on ? ', 착용 중' : own ? ', 보유' : `, ${it.price} 코인`}`}
              >
                <PeaPreview bean={tab === 'bean' ? (it.id as BeanId) : bean} acc={tab === 'acc' ? (it.id as AccId) : 'none'} size={46} />
                <span className="item-name">{it.name}</span>
                <span className="item-price">
                  {on ? '착용 중' : own ? '보유' : (
                    <>
                      <Coin size={11} /> {it.price}
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <button className="btn" type="button" disabled={action.disabled} onClick={action.run}>
          {action.label}
        </button>
        <button className="link" type="button" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
