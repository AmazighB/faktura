import { AppProvider } from '@/app/providers/AppProvider';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { ToastProvider } from '@/app/providers/ToastProvider';
import { ConfirmProvider } from '@/app/providers/ConfirmProvider';
import { AppRouter } from '@/app/routes/router';

function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppRouter />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </AppProvider>
  );
}

export default App;
