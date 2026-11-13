import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { SubjectCardSkeleton } from '../../components/Skeleton'
import {
  ApiError,
  subjectsApi,
  type Subject,
  type SubjectInput,
  type UpdateSubjectInput,
} from '../../lib/api'

const colors = ['#6366f1', '#f59e0b', '#10b981', '#f87171', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6']
const icons = ['📚', '∑', 'ក', '🧬', 'Aa', '⚛', '🌏', '🎨', '💻', '🎵']

const suggestions = [
  { key: 'math', icon: '∑', color: '#6366f1' },
  { key: 'science', icon: '🧬', color: '#10b981' },
  { key: 'english', icon: 'Aa', color: '#f59e0b' },
  { key: 'history', icon: '🌏', color: '#f87171' },
  { key: 'coding', icon: '💻', color: '#3b82f6' },
  { key: 'khmer', icon: 'ក', color: '#ec4899' },
] as const

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

export function SubjectsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [includeArchived, setIncludeArchived] = useState(false)
  const [editor, setEditor] = useState<{ subject?: Subject; draft?: Partial<SubjectInput> } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      subjectsApi.update(id, { archived }),
    onSuccess: () => {
      setActionError(null)
      void queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
    onError: (err) => setActionError(errorMessage(err, t('subjects.actionError'))),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => subjectsApi.remove(id),
    onSuccess: () => {
      setActionError(null)
      setPendingDelete(null)
      void queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
    onError: (err) => setActionError(errorMessage(err, t('subjects.actionError'))),
  })

  const subjectsQuery = useQuery({
    queryKey: ['subjects', { includeArchived }],
    queryFn: () => subjectsApi.list(includeArchived ? undefined : false),
  })

  const subjects = subjectsQuery.data ?? []
  const activeCount = subjects.filter((subject) => !subject.archived).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{t('subjects.title')}</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {t('subjects.subtitle')} {!subjectsQuery.isLoading && `· ${t('subjects.activeCount', { count: activeCount })}`}
          </p>
        </div>
        <Button onClick={() => setEditor({})}>
          <Icon name="plus" size={18} /> {t('subjects.newSubject')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          {t('subjects.showArchived')}
        </label>
        <Button variant="ghost" size="sm" onClick={() => void subjectsQuery.refetch()} disabled={subjectsQuery.isFetching}>
          <Icon name="reset" size={16} /> {t('common.refresh')}
        </Button>
      </div>

      {actionError && (
        <p role="alert" className="rounded-2xl bg-[var(--color-danger-soft,var(--color-surface-alt))] px-3 py-2 text-sm font-bold text-[var(--color-danger)]">
          {actionError}
        </p>
      )}

      {subjectsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SubjectCardSkeleton />
          <SubjectCardSkeleton />
          <SubjectCardSkeleton />
        </div>
      ) : subjectsQuery.isError ? (
        <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-8 text-center">
          <p className="font-bold">{t('subjects.loadError')}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {errorMessage(subjectsQuery.error, t('subjects.actionError'))}
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => void subjectsQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Icon name="layers" size={28} />
          </span>
          <p className="mt-3 text-lg font-black">{t('subjects.emptyTitle')}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{t('subjects.emptyHint')}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.key}
                onClick={() =>
                  setEditor({
                    draft: {
                      name: t(`subjects.suggestions.${suggestion.key}`),
                      icon: suggestion.icon,
                      color: suggestion.color,
                    },
                  })
                }
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-bold hover:bg-[var(--color-surface-alt)]"
              >
                <span aria-hidden>{suggestion.icon}</span>
                {t(`subjects.suggestions.${suggestion.key}`)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--color-muted)]">{t('subjects.suggestionHint')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <article key={subject.id} className={`surface-card p-4 ${subject.archived ? 'opacity-65' : ''}`}>
              <div className="flex items-start gap-3">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: `${subject.color}22`, color: subject.color }}
                  aria-hidden
                >
                  {subject.icon || '📚'}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-black">{subject.name}</h2>
                  <p className="text-xs text-[var(--color-muted)]">
                    {subject.archived ? t('subjects.archived') : t('subjects.updated', { date: new Date(subject.updatedAt).toLocaleDateString() })}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditor({ subject })} aria-label={t('subjects.edit')}>
                  <Icon name="edit" size={17} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => archiveMutation.mutate({ id: subject.id, archived: !subject.archived })}
                  disabled={archiveMutation.isPending}
                  aria-label={subject.archived ? t('subjects.unarchive') : t('subjects.archive')}
                >
                  <Icon name={subject.archived ? 'checkCircle' : 'bookmark'} size={17} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPendingDelete(subject)} aria-label={t('common.delete')}>
                  <Icon name="trash" size={17} className="text-[var(--color-danger)]" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editor && (
        <SubjectEditor
          subject={editor.subject}
          draft={editor.draft}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null)
            void queryClient.invalidateQueries({ queryKey: ['subjects'] })
          }}
        />
      )}

      <Modal open={pendingDelete !== null} title={t('subjects.deleteTitle')} onClose={() => setPendingDelete(null)}>
        <p className="text-sm text-[var(--color-muted)]">
          {t('subjects.deleteBody', { name: pendingDelete?.name ?? '' })}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingDelete(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={deleteMutation.isPending}
            onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
          >
            {deleteMutation.isPending ? t('common.loading') : t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function SubjectEditor({
  subject,
  draft,
  onClose,
  onSaved,
}: {
  subject?: Subject
  draft?: Partial<SubjectInput>
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(subject?.name ?? draft?.name ?? '')
  const [color, setColor] = useState(subject?.color ?? draft?.color ?? colors[0])
  const [icon, setIcon] = useState(subject?.icon ?? draft?.icon ?? icons[0])
  const [error, setError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: (input: SubjectInput | UpdateSubjectInput) =>
      subject ? subjectsApi.update(subject.id, input) : subjectsApi.create(input as SubjectInput),
    onSuccess: onSaved,
    onError: (err) => setError(errorMessage(err, t('subjects.actionError'))),
  })

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t('subjects.nameRequired'))
      return
    }
    setError(null)
    saveMutation.mutate({ name: trimmed, color, icon: icon.trim() || null })
  }

  return (
    <Modal open title={subject ? t('subjects.editTitle') : t('subjects.createTitle')} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label htmlFor="subject-name" className="block text-sm font-bold">
            {t('subjects.name')}
          </label>
          <input
            id="subject-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            autoFocus
            placeholder={t('subjects.namePlaceholder')}
            className="mt-1 w-full rounded-2xl px-4 py-3 font-semibold"
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
            }}
          />
        </div>

        <div>
          <span className="block text-sm font-bold">{t('subjects.icon')}</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {icons.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setIcon(option)}
                aria-label={option}
                aria-pressed={icon === option}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl ${
                  icon === option
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
              >
                {option}
              </button>
            ))}
            <input
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              maxLength={32}
              aria-label={t('subjects.customIcon')}
              placeholder={t('subjects.customIcon')}
              className="min-h-10 w-24 rounded-xl px-2 text-center text-sm font-semibold"
            />
          </div>
        </div>

        <div>
          <span className="block text-sm font-bold">{t('subjects.color')}</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {colors.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setColor(option)}
                aria-label={option}
                aria-pressed={color === option}
                className={`h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-[var(--color-surface)] ${
                  color === option ? 'ring-[var(--color-text)]' : 'ring-transparent'
                }`}
                style={{ backgroundColor: option }}
              />
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-[var(--color-surface-alt)] px-3 py-2 text-sm font-bold text-[var(--color-danger)]">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
