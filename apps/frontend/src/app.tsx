import type { PropsWithChildren } from 'react';

import { AppStoreProvider } from '@/shared/store/app-store';

import './styles/app.scss';

function App({ children }: PropsWithChildren) {
  return <AppStoreProvider>{children}</AppStoreProvider>;
}

export default App;
