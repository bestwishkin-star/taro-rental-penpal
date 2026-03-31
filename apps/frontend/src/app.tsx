import type { PropsWithChildren } from 'react';

import './styles/app.scss';

function App({ children }: PropsWithChildren) {
  return <>{children}</>;
}

export default App;
