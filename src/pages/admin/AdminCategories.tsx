import { Fragment, useState } from 'react'
import { AdminButton, AdminError, AdminHeading, AdminTable } from './AdminLayout'
import { useAsync } from '@/hooks/useAsync'
import {
  createCategory,
  deleteCategory,
  listAllCategories,
  listAllProducts,
  renameCategory,
} from '@/data/admin'

export function AdminCategories() {
  const [reload, setReload] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newName, setNewName] = useState('')
  const [newParent, setNewParent] = useState('')

  const { data: categories } = useAsync(() => listAllCategories(), [reload])
  const { data: products } = useAsync(() => listAllProducts(), [reload])

  const all = categories ?? []
  const top = all.filter((c) => c.parent_id === null)
  const countFor = (id: string) => (products ?? []).filter((p) => p.category_id === id).length

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setReload((n) => n + 1)
    } catch (e) {
      setError((e as Error).message || 'That change was refused.')
    } finally {
      setBusy(false)
    }
  }

  async function onAdd() {
    if (!newName.trim()) return
    await run(() => createCategory(newName, newParent || null))
    setNewName('')
    setNewParent('')
  }

  async function onRename(id: string, current: string) {
    const next = window.prompt('New name', current)
    if (next && next.trim() && next !== current) await run(() => renameCategory(id, next))
  }

  async function onDelete(id: string, name: string, hasProducts: boolean) {
    const warning = hasProducts
      ? `"${name}" still has products. They will stay in the catalogue but lose their category. Continue?`
      : `Delete "${name}"?`
    if (window.confirm(warning)) await run(() => deleteCategory(id))
  }

  return (
    <>
      <AdminHeading
        title="Categories"
        note="One level of sub-categories. A sub-category cannot itself have children."
      />
      <AdminError error={error} />

      <div className="mb-4 flex flex-wrap items-end gap-3 border border-ivory-300 bg-ivory-50 p-4">
        <label className="flex-1">
          <span className="mb-1.5 block text-[0.6rem] tracking-[0.2em] text-charcoal-400 uppercase">
            New category
          </span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Earrings"
            className="w-full border border-ivory-400 bg-transparent px-3 py-2 text-sm font-light focus:border-charcoal-800 focus:outline-none"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-[0.6rem] tracking-[0.2em] text-charcoal-400 uppercase">
            Inside
          </span>
          <select
            value={newParent}
            onChange={(e) => setNewParent(e.target.value)}
            className="cursor-pointer border border-ivory-300 bg-ivory-50 px-3 py-2 text-sm focus:border-charcoal-800 focus:outline-none"
          >
            <option value="">Top level</option>
            {top.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <AdminButton onClick={onAdd} disabled={busy || !newName.trim()}>
          Add
        </AdminButton>
      </div>

      <AdminTable columns={['Category', 'Products', '']}>
        {top.map((parent) => {
          const children = all.filter((c) => c.parent_id === parent.id)
          return (
            <Fragment key={parent.id}>
              <tr className="border-b border-ivory-300">
                <td className="px-5 py-4 font-serif text-lg text-charcoal-800">{parent.name}</td>
                <td className="px-5 py-4 font-light text-charcoal-400 tabular-nums">{countFor(parent.id)}</td>
                <td className="px-5 py-4 text-right whitespace-nowrap">
                  <span className="inline-flex gap-2">
                    <AdminButton disabled={busy} onClick={() => onRename(parent.id, parent.name)}>
                      Rename
                    </AdminButton>
                    <AdminButton
                      disabled={busy}
                      tone="danger"
                      onClick={() => onDelete(parent.id, parent.name, countFor(parent.id) > 0)}
                    >
                      Delete
                    </AdminButton>
                  </span>
                </td>
              </tr>
              {children.map((child) => (
                <tr key={child.id} className="border-b border-ivory-300 last:border-0">
                  <td className="px-4 py-3 pl-10 text-charcoal-400">
                    <span className="mr-2 text-line">└</span>
                    {child.name}
                  </td>
                  <td className="px-5 py-4 font-light text-charcoal-400 tabular-nums">{countFor(child.id)}</td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <span className="inline-flex gap-2">
                      <AdminButton disabled={busy} onClick={() => onRename(child.id, child.name)}>
                        Rename
                      </AdminButton>
                      <AdminButton
                        disabled={busy}
                        tone="danger"
                        onClick={() => onDelete(child.id, child.name, countFor(child.id) > 0)}
                      >
                        Delete
                      </AdminButton>
                    </span>
                  </td>
                </tr>
              ))}
            </Fragment>
          )
        })}
      </AdminTable>

      <p className="mt-4 text-sm leading-relaxed font-light text-charcoal-400">
        The one-level rule is enforced by the database, not just here — a trigger rejects any
        attempt to give a sub-category its own children, whatever the screen allows.
      </p>
    </>
  )
}
