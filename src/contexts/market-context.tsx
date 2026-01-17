import { type ListedIdea } from '@/components/shop/shop';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { KioskClient, Network } from '@mysten/kiosk';
import { error } from 'console';
import * as React from 'react';

// Shape of a single kiosk
interface Kiosk {
    id: string,
    owner: string,
    kiosks: {
        kid: string;
        ideaId: string[];
    }[]
    // note: matches your MongoDB schema field name "ideaId"
}

// Context type
interface MarketContextType {
    ideas: ListedIdea[],
    kiosks: Kiosk[];
    loading: boolean;
    loadKiosks: () => Promise<void>;
    addIdeaToKiosk: (kid: string, oid: string) => Promise<void>;
    removeIdeaFromKiosk: (kid: string, oid: string) => Promise<void>;
    removeKiosk: (kid: string) => Promise<void>;
}

const MarketContext = React.createContext<MarketContextType | undefined>(undefined);

export function MarketProvider({ children }: { children: React.ReactNode }) {
    const [kiosks, setKiosks] = React.useState<Kiosk[]>([]);
    const [ideas, setIdeas] = React.useState<ListedIdea[]>([]);
    const [loading, setLoading] = React.useState(false);
    const currAccount = useCurrentAccount();
    const suiClient = useSuiClient();

    const endpoint = import.meta.env.VITE_ENDPOINT;

    // Load all kiosks for the current user (or guest)
    const loadKiosks = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${endpoint}/market`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load kiosks');
            }

            const data = await response.json();
            const allKiosks = data.market as Kiosk[];
            setKiosks(allKiosks || []);
            getAllIdeas(allKiosks);
        } catch (error) {
            console.error('Error loading kiosks:', error);
            setKiosks([]);
        } finally {
            setLoading(false);
        }
    }, [endpoint]);

    // Call on mount
    React.useEffect(() => {
        loadKiosks();
    }, []);

    const getAllIdeas = (allKiosks: Kiosk[]) => {
        const kioskClient = new KioskClient({
            client: suiClient,
            network: Network.TESTNET,
        });
        if (allKiosks.length > 0) {
            let allIdeas: ListedIdea[] = [];
            allKiosks.forEach(async (kioskData) => {
                for (const kiosk of kioskData.kiosks) {
                    const response = await kioskClient.getKiosk({
                        id: kiosk.kid,
                        options: {
                            withObjects: true,
                            objectOptions: {
                                showContent: true
                            }
                        }
                    })
                    const savedIdea = response.items
                        .filter(item => item.type === `${import.meta.env.VITE_PID}::${import.meta.env.VITE_MODULE_IDEA}::Idea`)
                        .flatMap(item => {
                            // Kiểm tra content và fields một cách an toàn
                            const fields = (item.data?.content as any)?.fields;

                            if (!fields) return []; // Nếu không có dữ liệu, trả về mảng rỗng để flatMap loại bỏ

                            return [{
                                id: fields.id.id,
                                title: fields.name,
                                image: fields.image_url,
                                description: fields.description,
                                creator: fields.owner_name,
                                downloads: fields.num_download,
                                category: fields.tags || "Uncategorized", // Tránh lỗi nếu tags trống
                                price: fields.price,
                                kioskId: kiosk.kid,
                            } as ListedIdea];
                        });

                    allIdeas.push(...savedIdea);

                }
            })
            setIdeas(allIdeas);
        }
    }

    // Add an ideaId (oid) to a kiosk
    const addIdeaToKiosk = async (kid: string, oid: string) => {
        if (!currAccount) {
            throw error('connect wallet please');
        }
        const owner = currAccount.address;
        try {
            const response = await fetch(`${endpoint}/market`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, kid, oid }),
            });

            console.log('response add idea: ', response);
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to add idea');
            }

            // const data = await response.json();
            await loadKiosks();
        } catch (error) {
            console.error('Error adding idea:', error);
            throw error;
        }
    };

    // Remove an ideaId from a kiosk
    const removeIdeaFromKiosk = async (kid: string, oid: string) => {
        if (!currAccount) {
            throw error('connect wallet please');
        }
        const owner = currAccount.address;

        try {
            const response = await fetch(`${endpoint}/market/idea`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, kid, oid }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to remove idea');
            }

            const data = await response.json();
            setKiosks(data.market.kiosks);
        } catch (error) {
            console.error('Error removing idea:', error);
            throw error;
        }
    };

    // Remove entire kiosk
    const removeKiosk = async (kid: string) => {
        if (!currAccount) {
            throw error('connect wallet please');
        }
        const owner = currAccount.address;

        try {
            const response = await fetch(`${endpoint}/market/kiosk`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, kid }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to remove kiosk');
            }

            const data = await response.json();
            setKiosks(data.market.kiosks);
        } catch (error) {
            console.error('Error removing kiosk:', error);
            throw error;
        }
    };

    const value: MarketContextType = {
        ideas,
        kiosks,
        loading,
        loadKiosks,
        addIdeaToKiosk,
        removeIdeaFromKiosk,
        removeKiosk,
    };

    return (
        <MarketContext.Provider value={value}>
            {children}
        </MarketContext.Provider>
    );
}

export function useMarket() {
    const context = React.useContext(MarketContext);
    if (context === undefined) {
        throw new Error('useMarket must be used within a MarketProvider');
    }
    return context;
}
