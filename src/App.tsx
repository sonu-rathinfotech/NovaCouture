import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/layout/SiteLayout'
import { Home } from './pages/Home'
import { CategoryPage } from './pages/CategoryPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { ProductPage } from './pages/ProductPage'
import { StaticPage } from './pages/StaticPage'
import { SignIn } from './pages/SignIn'
import { Register } from './pages/Register'
import { CollectionPage } from './pages/CollectionPage'
import { NotFound } from './pages/NotFound'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminProducts } from './pages/admin/AdminProducts'
import { AdminProductEdit } from './pages/admin/AdminProductEdit'
import { AdminCategories } from './pages/admin/AdminCategories'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminLinks } from './pages/admin/AdminLinks'
import { AdminLinkNew } from './pages/admin/AdminLinkNew'
import { AdminLinkDetail } from './pages/admin/AdminLinkDetail'

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="collections" element={<CategoriesPage />} />
        <Route path="c/:categorySlug" element={<CategoryPage />} />
        <Route path="p/:productSlug" element={<ProductPage />} />
        <Route path="collection/:token" element={<CollectionPage />} />
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
        <Route path="products/:productId" element={<AdminProductEdit />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="links" element={<AdminLinks />} />
        <Route path="links/new" element={<AdminLinkNew />} />
        <Route path="links/:collectionId" element={<AdminLinkDetail />} />
      </Route>
    </Routes>
  )
}
