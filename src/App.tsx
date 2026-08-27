import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/layout/SiteLayout'
import { Home } from './pages/Home'
import { CategoryPage } from './pages/CategoryPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { ProductPage } from './pages/ProductPage'
import { SignIn } from './pages/SignIn'
import { Register } from './pages/Register'

// Everything outside the core browsing flow loads lazily, so the first paint
// ships only what the catalogue needs: home, categories, products. Static
// pages, curated links, the 404 and the whole admin panel arrive on demand.
const StaticPage = lazy(() =>
  import('./pages/StaticPage').then((m) => ({ default: m.StaticPage })),
)
const CollectionPage = lazy(() =>
  import('./pages/CollectionPage').then((m) => ({ default: m.CollectionPage })),
)
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })))
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })))
const AdminLayout = lazy(() =>
  import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
)
const AdminProducts = lazy(() =>
  import('./pages/admin/AdminProducts').then((m) => ({ default: m.AdminProducts })),
)
const AdminProductEdit = lazy(() =>
  import('./pages/admin/AdminProductEdit').then((m) => ({ default: m.AdminProductEdit })),
)
const AdminBulkUpload = lazy(() =>
  import('./pages/admin/AdminBulkUpload').then((m) => ({ default: m.AdminBulkUpload })),
)
const AdminCategories = lazy(() =>
  import('./pages/admin/AdminCategories').then((m) => ({ default: m.AdminCategories })),
)
const AdminUsers = lazy(() =>
  import('./pages/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })),
)
const AdminLinks = lazy(() =>
  import('./pages/admin/AdminLinks').then((m) => ({ default: m.AdminLinks })),
)
const AdminLinkNew = lazy(() =>
  import('./pages/admin/AdminLinkNew').then((m) => ({ default: m.AdminLinkNew })),
)
const AdminLinkDetail = lazy(() =>
  import('./pages/admin/AdminLinkDetail').then((m) => ({ default: m.AdminLinkDetail })),
)

// Ordering: reached only by a signed-in client who has chosen pieces, so it
// has no business in the first paint.
const OrderDraftPage = lazy(() =>
  import('./pages/OrderDraftPage').then((m) => ({ default: m.OrderDraftPage })),
)
const MyOrders = lazy(() => import('./pages/MyOrders').then((m) => ({ default: m.MyOrders })))
const OrderDetail = lazy(() =>
  import('./pages/OrderDetail').then((m) => ({ default: m.OrderDetail })),
)
const AdminOrders = lazy(() =>
  import('./pages/admin/AdminOrders').then((m) => ({ default: m.AdminOrders })),
)
const AdminOrderDetail = lazy(() =>
  import('./pages/admin/AdminOrderDetail').then((m) => ({ default: m.AdminOrderDetail })),
)
const AdminCompanySettings = lazy(() =>
  import('./pages/admin/AdminCompanySettings').then((m) => ({ default: m.AdminCompanySettings })),
)

/** Shown for the brief moment a lazily-loaded route is being fetched. */
function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-bg)]">
      <span className="eyebrow">Loading…</span>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="collections" element={<CategoriesPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="c/:categorySlug" element={<CategoryPage />} />
          <Route path="p/:productSlug" element={<ProductPage />} />
          <Route path="collection/:token" element={<CollectionPage />} />
          <Route path="order" element={<OrderDraftPage />} />
          <Route path="orders" element={<MyOrders />} />
          <Route path="orders/:orderId" element={<OrderDetail />} />
          <Route path="about" element={<StaticPage slug="about" />} />
          <Route path="contact" element={<StaticPage slug="contact" />} />
          <Route path="privacy" element={<StaticPage slug="privacy" />} />
          <Route path="terms" element={<StaticPage slug="terms" />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Sign-in and registration are full-height split screens, so they sit
            outside the site layout — a header stacked above would halve the
            photograph and break the effect. */}
        <Route path="sign-in" element={<SignIn />} />
        <Route path="register" element={<Register />} />

        {/* Admin is outside the public layout: no site header, no footer.
            Access is enforced by RLS, not by this route being hidden. */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductEdit />} />
          <Route path="bulk-upload" element={<AdminBulkUpload />} />
          <Route path="products/:productId" element={<AdminProductEdit />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="links" element={<AdminLinks />} />
          <Route path="links/new" element={<AdminLinkNew />} />
          <Route path="links/:collectionId" element={<AdminLinkDetail />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:orderId" element={<AdminOrderDetail />} />
          <Route path="settings" element={<AdminCompanySettings />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
