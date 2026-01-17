import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

interface CreateIdeaProps {
    title: string;
    description: string,
    price: string,
    category: string,
    creator: string,
    image: string,
    downloads: number,
};
function create_idea(
    {
        title, description, category, creator, downloads, image, price,
    }: CreateIdeaProps) {
    const tx = new Transaction();

    tx.setGasBudget(1_000_000_000);
    const pid = import.meta.env.VITE_PID;
    const module = import.meta.env.VITE_MODULE_IDEA;
    const func = 'create_idea';

    tx.moveCall({
        target: `${pid}::${module}::${func}`,
        arguments: [
            tx.object.random(),
            tx.pure.string(title),
            tx.pure.vector('u8', new TextEncoder().encode(image)),
            tx.pure.string(category),
            tx.pure.string(description),
            tx.pure.string(creator),
            tx.pure.u64(price),
            tx.pure.u64(downloads),
            tx.pure.string("start"),
            tx.pure.string("update"),
        ]
    });
    return tx;
}


function update_quilt_id(ideaId: string, quiltId: string) {
    const tx = new Transaction();

    tx.setGasBudget(1_000_000_000);
    const pid = import.meta.env.VITE_PID;
    const module = import.meta.env.VITE_MODULE_IDEA;
    const func = 'set_quilt_id';

    tx.moveCall({
        target: `${pid}::${module}::${func}`,
        arguments: [
            tx.object(ideaId),
            tx.pure.string(quiltId)
        ]
    });
    return tx;
}

interface ListIdeaProps {
    ideaId: string,
    kioskId: string,
    kioskOwnerCapId: string
};
function list_idea(
    {
        ideaId, kioskId, kioskOwnerCapId
    }: ListIdeaProps) {
    const tx = new Transaction();

    tx.setGasBudget(1_000_000_000);
    const pid = import.meta.env.VITE_PID;
    const module = import.meta.env.VITE_MODULE_MARKET;
    const func = 'place_and_list';

    tx.moveCall({
        target: `${pid}::${module}::${func}`,
        arguments: [
            tx.object(ideaId),
            tx.object(kioskId),
            tx.object(kioskOwnerCapId)
        ]
    });
    return tx;
}


interface DelistIdeaProps {
    ideaId: string,
    kioskId: string,
    kioskOwnerCapId: string
};
function delist_burn({ ideaId, kioskId, kioskOwnerCapId }: DelistIdeaProps) {
    const pid = import.meta.env.VITE_PID;
    const module = import.meta.env.VITE_MODULE_MARKET;
    const func = import.meta.env.VITE_FUNC_dtb;
    const tx = new Transaction();
    tx.moveCall({
        target: `${pid}::${module}::${func}`,
        arguments: [
            tx.pure.address(ideaId),
            tx.object(kioskId),
            tx.object(kioskOwnerCapId)
        ]
    });
    return tx;
}


interface PurchaseIdeaProps {
    price: number,
    ideaId: string,
    kioskId: string,
};
function purchase({ price, ideaId, kioskId }: PurchaseIdeaProps) {
    const pid = import.meta.env.VITE_PID;
    const module = import.meta.env.VITE_MODULE_MARKET;
    const func = import.meta.env.VITE_FUNC_purchase;
    const policy = import.meta.env.VITE_TP;
    const tx = new Transaction();

    const coin = tx.splitCoins(tx.gas, [price]);
    tx.moveCall({
        target: `${pid}::${module}::${func}`,
        arguments: [
            tx.pure.id(ideaId),
            tx.object(coin),
            tx.object(kioskId),
            tx.object(policy)
        ]
    });
    return tx;
}

interface SealApproveProps {
    sender: string,
    sealId: Uint8Array,
    approvalPurchaseId: string,
};
async function sealApproveTx({ sender, sealId, approvalPurchaseId }: SealApproveProps) {
    // Validate inputs
    if (!sender || !sender.startsWith('0x')) {
        throw new Error('Invalid sender address');
    }
    if (!sealId || sealId.length === 0) {
        throw new Error('Invalid sealId: must be a non-empty Uint8Array');
    }
    if (!approvalPurchaseId || !approvalPurchaseId.startsWith('0x')) {
        throw new Error('Invalid approvalPurchaseId: must be a valid object ID');
    }

    const tx = new Transaction();
    const pid = import.meta.env.VITE_PID;
    const module = import.meta.env.VITE_MODULE_SEAL_POLICY;
    const func = import.meta.env.VITE_FUNC_seal_approve;

    tx.setSender(sender);
    tx.moveCall({
        target: `${pid}::${module}::${func}`,
        arguments: [
            tx.pure.vector('u8', sealId),
            tx.object(approvalPurchaseId),
        ]
    });

    const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

    try {
        const txBytes = await tx.build({
            client: suiClient,
            onlyTransactionKind: true
        });
        return txBytes;
    } catch (error) {
        console.error('Error building seal_approve transaction:', error);
        throw new Error(`Failed to build transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export type { ListIdeaProps, DelistIdeaProps, PurchaseIdeaProps };
export { create_idea, update_quilt_id, delist_burn, list_idea, purchase, sealApproveTx }