import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Icon, type IconName } from '../../components/Icon'
import { Mascot, type Accessory } from '../../components/Mascot'
import { Modal } from '../../components/Modal'
import { ProgressBar } from '../../components/ProgressBar'
import { celebrate } from '../../lib/confetti'
import {
  SHOP_ITEMS,
  buddyStageKey,
  levelTitleKey,
  useApp,
  xpForNext,
  type ShopItem,
} from '../../lib/store'
import { gameApi, petApi, shopApi, type ShopItemDto } from '../../lib/api'
import { isGuestMode, useAuth } from '../../lib/auth'
import { studyKeys, useGameState } from '../../lib/study'

/** Server item ids that differ from the i18n/UI ids. */
const SERVER_ITEM_ID_TO_UI: Record<string, string> = { theme_ocean: 'themeOcean' }

/** Shop item as used by the UI: mock items carry an i18n key, unknown server items carry a raw name. */
type UiShopItem = Omit<ShopItem, 'nameKey'> & { nameKey?: string; name?: string }

function mapServerShopItem(dto: ShopItemDto, language: string): UiShopItem {
  const uiId = SERVER_ITEM_ID_TO_UI[dto.id] ?? dto.id
  const known = SHOP_ITEMS.find((item) => item.id === uiId)
  if (known) {
    return { ...known, price: dto.price, kind: dto.kind as ShopItem['kind'] }
  }
  // Unknown server item: fall back to the server-provided localized name.
  return {
    id: uiId,
    name: language === 'km' ? dto.nameKm : dto.nameEn,
    price: dto.price,
    kind: dto.kind as ShopItem['kind'],
    accessory: (dto.accessoryType ?? undefined) as ShopItem['accessory'],
  }
}

const badgeIcons: Record<string, IconName> = {
  firstFlip: 'cards',
  collector: 'layers',
  century: 'target',
  memory: 'sparkles',
  weekWarrior: 'flame',
  monthMonarch: 'trophy',
  focusHero: 'timer',
  nightOwl: 'moon',
  perfect: 'star',
  bossSlayer: 'sword',
  noteNinja: 'note',
  quizWhiz: 'target',
  comeback: 'reset',
  explorer: 'compass',
  polyglot: 'users',
}

const shopIcons: Record<string, IconName> = {
  hat: 'sparkles',
  glasses: 'search',
  scarf: 'heart',
  cape: 'shield',
  freeze: 'flame',
  themeOcean: 'palette',
}

export function ProfilePage() {
  const { t, i18n } = useTranslation()
  const nickname = useApp((s) => s.nickname)
  const buddy = useApp((s) => s.buddy)
  const setNickname = useApp((s) => s.setNickname)
  const mockOwned = useApp((s) => s.owned)
  const mockEquipped = useApp((s) => s.equipped)
  const buyItem = useApp((s) => s.buyItem)
  const equipItem = useApp((s) => s.equipItem)

  const user = useAuth((s) => s.user)
  const gameQuery = useGameState()
  const queryClient = useQueryClient()
  const isGuest = isGuestMode()

  const badgesQuery = useQuery({
    queryKey: studyKeys.gameBadges(user?.id),
    queryFn: gameApi.badges,
    staleTime: 1000 * 60,
  })

  // Registered users buy from the server-validated shop; guests keep the
  // isolated local store.
  const shopItemsQuery = useQuery({
    queryKey: studyKeys.shopItems(user?.id),
    queryFn: shopApi.items,
    enabled: !isGuest,
    staleTime: 1000 * 60,
  })
  const shopOwnedQuery = useQuery({
    queryKey: studyKeys.shopOwned(user?.id),
    queryFn: shopApi.owned,
    enabled: !isGuest,
  })
  const petQuery = useQuery({
    queryKey: studyKeys.pet(user?.id),
    queryFn: petApi.get,
    enabled: !isGuest,
    staleTime: 1000 * 60,
  })

  const state = gameQuery.data
  const level = state?.level ?? 1
  const xp = state?.xpTotal ?? 0
  const coins = state?.coins ?? 0
  const streak = state?.streakCurrent ?? 0
  const bestStreak = state?.streakBest ?? 0

  const shopItems: UiShopItem[] = isGuest
    ? SHOP_ITEMS
    : (shopItemsQuery.data ?? []).map((dto) => mapServerShopItem(dto, i18n.language))
  const owned: string[] = isGuest
    ? mockOwned
    : (shopOwnedQuery.data ?? []).map((o) => SERVER_ITEM_ID_TO_UI[o.shopItemId] ?? o.shopItemId)
  const equipped: string | null = isGuest
    ? mockEquipped
    : (petQuery.data?.equippedAccessory ?? null)

  const buyMutation = useMutation({
    mutationFn: (item: UiShopItem) => shopApi.buy(item.id),
    onSuccess: (_result, item) => {
      setMessage(t('profile.bought', { name: item.name ?? t(`profile.items.${item.id}`) }))
      celebrate()
      queryClient.invalidateQueries({ queryKey: studyKeys.gameState(user?.id) })
      queryClient.invalidateQueries({ queryKey: studyKeys.shopOwned(user?.id) })
      window.setTimeout(() => setMessage(null), 2600)
    },
    onError: (err: Error) => {
      setMessage(err.message || t('profile.notEnoughCoins'))
      window.setTimeout(() => setMessage(null), 2600)
    },
  })

  const equipMutation = useMutation({
    mutationFn: (accessory: string | null) => petApi.equip(accessory ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyKeys.pet(user?.id) })
      setPreview(null)
    },
    onError: (err: Error) => {
      setMessage(err.message || t('common.error'))
      window.setTimeout(() => setMessage(null), 2600)
    },
  })

  const badgeDtos = badgesQuery.data ?? []
  const earnedBadges = badgeDtos.filter((b) => b.earned).map((b) => b.code)
  const ownedCount = earnedBadges.length

  const nextXp = xpForNext(level)
  const [joined] = useState(() =>
    new Intl.DateTimeFormat(i18n.language === 'km' ? 'km-KH' : 'en-US', {
      month: 'long',
      year: 'numeric',
    }).format(new Date()),
  )

  const [preview, setPreview] = useState<UiShopItem | null>(null)
  const [nameOpen, setNameOpen] = useState(false)
  const [nameValue, setNameValue] = useState(nickname)
  const [message, setMessage] = useState<string | null>(null)

  const previewAccessory = preview?.accessory ?? null

  const purchase = () => {
    if (!preview) return
    if (isGuest) {
      const ok = buyItem(preview)
      if (ok) {
        setMessage(t('profile.bought', { name: preview.name ?? (preview.nameKey ? t(preview.nameKey) : preview.id) }))
        celebrate()
      } else {
        setMessage(t('profile.notEnoughCoins'))
      }
      window.setTimeout(() => setMessage(null), 2600)
    } else {
      buyMutation.mutate(preview)
    }
  }

  const toggleEquip = (item: UiShopItem) => {
    const accessory = item.accessory ?? null
    if (isGuest) {
      equipItem(equipped === accessory ? null : accessory)
      setPreview(null)
    } else {
      equipMutation.mutate(equipped === accessory ? null : accessory)
    }
  }

  const saveName = () => {
    setNickname(nameValue)
    setNameOpen(false)
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-5 text-white shadow-[var(--shadow-lift)]">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-end">
          <div className="rounded-[28px] bg-white/10 p-3 ring-1 ring-white/20">
            <Mascot species={buddy} mood="happy" size={150} accessory={equipped as Accessory} />
          </div>
          <div className="flex-1 text-center sm:pb-2 sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">{t(`profile.buddies.${buddy}`)}</p>
            <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-black sm:text-3xl">{nickname}</h1>
              <button
                onClick={() => {
                  setNameValue(nickname)
                  setNameOpen(true)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                aria-label={t('profile.editName')}
              >
                <Icon name="edit" size={16} />
              </button>
            </div>
            <p className="mt-1 text-sm font-semibold text-white/80">
              {t('shell.levelShort', { level })} · {t(`profile.titles.${levelTitleKey(level)}`)} · {t(`profile.stages.${buddyStageKey(level)}`)}
            </p>
            <div className="mt-2 max-w-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-white/70">
                <span>XP</span>
                <span>{xp}/{nextXp}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.min(100, (xp / nextXp) * 100)}%` }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:pb-2">
            <div className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
              <p className="text-lg font-black">{coins}</p>
              <p className="text-[10px] font-bold text-white/70">{t('shell.coin')}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
              <p className="text-lg font-black">{streak}</p>
              <p className="text-[10px] font-bold text-white/70">{t('profile.streak')}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
              <p className="text-lg font-black">{bestStreak}</p>
              <p className="text-[10px] font-bold text-white/70">{t('profile.bestStreak')}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">{t('profile.badges')}</h2>
            <Badge tone="accent">
              {ownedCount}/{badgeDtos.length}
            </Badge>
          </div>
          <p className="text-xs font-semibold text-[var(--color-muted)]">{t('profile.joined', { date: joined })}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {badgeDtos.map((badge) => {
              const earned = badge.earned
              return (
                <div
                  key={badge.code}
                  title={badge.descriptionEn}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-2 text-center ${
                    earned
                      ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 opacity-70 grayscale'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      earned
                        ? 'bg-[var(--color-accent)] text-[#3b2503]'
                        : 'bg-[var(--color-surface-alt)] text-[var(--color-muted)]'
                    }`}
                  >
                    <Icon name={earned ? badgeIcons[badge.code] ?? 'trophy' : 'lock'} size={19} />
                  </span>
                  <p className="text-[10px] font-black leading-tight">{badge.nameEn}</p>
                  <p className="text-[9px] font-bold text-[var(--color-muted)]">
                    {earned ? `+${badge.coinsReward}` : t('profile.locked')}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">{t('profile.shop')}</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-xs font-black text-[var(--color-accent)]">
              <Icon name="coin" size={13} /> {coins}
            </span>
          </div>
          <p className="text-xs font-semibold text-[var(--color-muted)]">{t('profile.shopHint')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {shopItems.map((item) => {
              const isOwned = owned.includes(item.id)
              const isEquipped = item.accessory && equipped === item.accessory
              return (
                <button
                  key={item.id}
                  onClick={() => setPreview(item)}
                  className={`flex items-start gap-2 rounded-2xl border p-2.5 text-left transition hover:border-[var(--color-primary)] ${
                    isEquipped
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]/40'
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-primary)]">
                    <Icon name={shopIcons[item.id] ?? 'gift'} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-extrabold">{item.name ?? (item.nameKey ? t(item.nameKey) : item.id)}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[10px] font-black text-[var(--color-accent)]">
                      {isEquipped ? (
                        <span className="text-[var(--color-primary)]">{t('profile.equipped')}</span>
                      ) : isOwned ? (
                        <span className="text-[var(--color-success)]">{t('profile.owned')}</span>
                      ) : (
                        <>
                          <Icon name="coin" size={11} /> {item.price}
                        </>
                      )}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          {message && (
            <p className="mt-2 rounded-xl bg-[var(--color-success-soft)] px-3 py-2 text-center text-xs font-bold text-[var(--color-success)]">
              {message}
            </p>
          )}
          <Link to="/settings" className="mt-3 flex items-center justify-center gap-1 text-xs font-bold text-[var(--color-primary)]">
            {t('profile.customize')} <Icon name="arrowRight" size={13} />
          </Link>
        </section>
      </div>

      <section className="rounded-[22px] bg-[var(--color-surface-alt)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold">{t('profile.nextLevel')}</h2>
          <span className="text-xs font-bold text-[var(--color-muted)]">{nextXp - xp} XP</span>
        </div>
        <div className="mt-2">
          <ProgressBar value={xp} max={nextXp} size="sm" />
        </div>
        <p className="mt-2 text-xs text-[var(--color-muted)]">{t('profile.nextLevelHint')}</p>
      </section>

      <Modal open={!!preview} title={preview ? t('profile.preview') : ''} onClose={() => setPreview(null)}>
        {preview && (
          <div className="text-center">
            <div className="flex justify-center rounded-[24px] bg-[var(--color-surface-alt)] py-3">
              <Mascot species={buddy} mood="sparkle" size={150} accessory={previewAccessory as Accessory} />
            </div>
            <h3 className="mt-3 text-lg font-black">{preview.name ?? (preview.nameKey ? t(preview.nameKey) : preview.id)}</h3>
            <p className="text-sm text-[var(--color-muted)]">
              {preview.name ? '' : t(`profile.itemDesc.${preview.id}`)}
            </p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-sm font-black text-[var(--color-accent)]">
              <Icon name="coin" size={14} /> {preview.price}
            </p>
            <div className="mt-4 space-y-2">
              {owned.includes(preview.id) ? (
                preview.accessory ? (
                  <Button
                    full
                    variant={equipped === preview.accessory ? 'secondary' : 'primary'}
                    onClick={() => toggleEquip(preview)}
                    disabled={equipMutation.isPending}
                  >
                    {equipped === preview.accessory ? t('profile.unequip') : t('profile.equip')}
                  </Button>
                ) : (
                  <Button full variant="secondary" onClick={() => setPreview(null)}>
                    {t('profile.owned')}
                  </Button>
                )
              ) : (
                <Button full onClick={purchase} disabled={coins < preview.price || buyMutation.isPending}>
                  <Icon name="coin" size={17} /> {t('profile.buy')}
                </Button>
              )}
              <button
                onClick={() => setPreview(null)}
                className="min-h-11 w-full rounded-2xl text-sm font-bold text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)]"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={nameOpen} title={t('profile.editName')} onClose={() => setNameOpen(false)}>
        <label className="text-sm font-bold" htmlFor="profile-name">{t('onboarding.nicknameLabel')}</label>
        <input
          id="profile-name"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value.slice(0, 18))}
          className="mt-1 w-full rounded-2xl px-4 py-2.5"
          autoFocus
        />
        <Button full className="mt-3" onClick={saveName} disabled={!nameValue.trim()}>
          {t('common.save')}
        </Button>
      </Modal>
    </div>
  )
}
