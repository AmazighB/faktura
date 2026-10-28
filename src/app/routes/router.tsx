import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router-dom';
import { ProtectedRoute } from '@/app/routes/ProtectedRoute';
import { LoadingOverlay } from '@/components/feedback/Loading';

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const ClientsListPage = lazy(() => import('@/features/clients/ClientsListPage'));
const ClientDetailPage = lazy(() => import('@/features/clients/ClientDetailPage'));
const ClientFormPage = lazy(() => import('@/features/clients/ClientFormPage'));
const ProductsPage = lazy(() => import('@/features/products/ProductsPage'));
const QuotesListPage = lazy(() => import('@/features/quotes/QuotesListPage'));
const QuoteEditorPage = lazy(() => import('@/features/quotes/QuoteEditorPage'));
const QuoteDetailPage = lazy(() => import('@/features/quotes/QuoteDetailPage'));
const InvoicesListPage = lazy(() => import('@/features/invoices/InvoicesListPage'));
const InvoiceEditorPage = lazy(() => import('@/features/invoices/InvoiceEditorPage'));
const InvoiceDetailPage = lazy(() => import('@/features/invoices/InvoiceDetailPage'));
const PaymentsPage = lazy(() => import('@/features/payments/PaymentsPage'));
const PaymentFormPage = lazy(() => import('@/features/payments/PaymentFormPage'));
const UnpaidPage = lazy(() => import('@/features/payments/UnpaidPage'));
const CreditNotesListPage = lazy(() => import('@/features/creditNotes/CreditNotesListPage'));
const CreditNoteEditorPage = lazy(() => import('@/features/creditNotes/CreditNoteEditorPage'));
const CreditNoteDetailPage = lazy(() => import('@/features/creditNotes/CreditNoteDetailPage'));
const ExpensesPage = lazy(() => import('@/features/expenses/ExpensesPage'));
const SuppliersPage = lazy(() => import('@/features/suppliers/SuppliersPage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const AdministrationPage = lazy(() => import('@/features/administration/AdministrationPage'));
const NotFoundPage = lazy(() => import('@/features/error/NotFoundPage'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));

const withSuspense = (el: React.ReactNode) => (
  <Suspense fallback={<LoadingOverlay message="Chargement..." />}>{el}</Suspense>
);

function RouteErrorPage() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : 'Une erreur est survenue.';

  return (
    <main role="alert">
      <h1>Une erreur est survenue</h1>
      <p>{message}</p>
    </main>
  );
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/onboarding',
    element: withSuspense(<OnboardingPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { errorElement: <RouteErrorPage />, children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: 'dashboard', element: withSuspense(<DashboardPage />) },
      { path: 'clients', element: withSuspense(<ClientsListPage />) },
      { path: 'clients/new', element: withSuspense(<ClientFormPage />) },
      { path: 'clients/:id', element: withSuspense(<ClientDetailPage />) },
      { path: 'clients/:id/edit', element: withSuspense(<ClientFormPage />) },
      { path: 'products', element: withSuspense(<ProductsPage />) },
      { path: 'quotes', element: withSuspense(<QuotesListPage />) },
      { path: 'quotes/new', element: withSuspense(<QuoteEditorPage />) },
      { path: 'quotes/:id', element: withSuspense(<QuoteDetailPage />) },
      { path: 'quotes/:id/edit', element: withSuspense(<QuoteEditorPage />) },
      { path: 'invoices', element: withSuspense(<InvoicesListPage />) },
      { path: 'invoices/new', element: withSuspense(<InvoiceEditorPage />) },
      { path: 'invoices/:id', element: withSuspense(<InvoiceDetailPage />) },
      { path: 'invoices/:id/edit', element: withSuspense(<InvoiceEditorPage />) },
      { path: 'credit-notes', element: withSuspense(<CreditNotesListPage />) },
      { path: 'credit-notes/new', element: withSuspense(<CreditNoteEditorPage />) },
      { path: 'credit-notes/:id', element: withSuspense(<CreditNoteDetailPage />) },
      { path: 'credit-notes/:id/edit', element: withSuspense(<CreditNoteEditorPage />) },
      { path: 'payments', element: withSuspense(<PaymentsPage />) },
      { path: 'payments/new', element: withSuspense(<PaymentFormPage />) },
      { path: 'payments/new/:invoiceId', element: withSuspense(<PaymentFormPage />) },
      { path: 'unpaid', element: withSuspense(<UnpaidPage />) },
      { path: 'expenses', element: withSuspense(<ExpensesPage />) },
      { path: 'suppliers', element: withSuspense(<SuppliersPage />) },
      { path: 'reports', element: withSuspense(<ReportsPage />) },
      { path: 'settings', element: withSuspense(<SettingsPage />) },
      { path: 'administration', element: withSuspense(<AdministrationPage />) },
      { path: 'profile', element: withSuspense(<ProfilePage />) },
      { path: '*', element: withSuspense(<NotFoundPage />) },
      ] },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}