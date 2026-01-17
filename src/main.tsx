import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/auth-context.tsx'
import { ProjectProvider } from './contexts/project-context.tsx'

import '@mysten/dapp-kit/dist/index.css';

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MarketProvider } from './contexts/market-context.tsx'

const queryClient = new QueryClient();
const networks = {
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
};

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={networks} defaultNetwork="testnet">
      <WalletProvider autoConnect>
        <AuthProvider>
          <ProjectProvider>
            <MarketProvider>
              <App />
            </MarketProvider>
          </ProjectProvider>
        </AuthProvider>
      </WalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>
)
