import React from "react";
import { motion } from "framer-motion";
import { assignTask } from "@/blockchain/taskHandler";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { STATUS_OPEN } from "./task";
import { toast } from "@/hooks/use-toast";

interface Proposal {
    fields: {
        freelancer: string;
        bid_amount: number;
        delivery_time: number;
        cover_letter: string;
        proposed_at: number;
    }
    type: string
}

interface ProposalsListModalProps {
    taskId: string;
    client: string;
    taskStatus: number;
    proposals: Proposal[];
    onClose: () => void;
}

const ProposalsListModal: React.FC<ProposalsListModalProps> = ({ taskId, client, taskStatus, proposals, onClose }) => {
    const currAccount = useCurrentAccount();
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const handleAssignProposals = (proposal: Proposal) => {
        if (!currAccount) {
            return;
        }
        if (taskStatus !== STATUS_OPEN) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Task is not open",
            })
            return;
        }
        if (client !== currAccount.address) {
            return;
        }
        const tx = assignTask(taskId, proposal.fields.freelancer, proposal.fields.delivery_time);
        signAndExecuteTransaction({
            transaction: tx
        }, {
            onSuccess: () => {
                onClose();
            },
            onError: (error) => {
                console.log(error);
            }
        })
    }
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-white"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl rounded-2xl border-2 border-yellow-400 bg-gray-900 p-8 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold uppercase text-yellow-400">Task Proposals</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <span className="text-2xl">✕</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {proposals.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 italic">
                            No proposals submitted yet.
                        </div>
                    ) : (
                        proposals.map((proposal, index) => (
                            <div
                                onClick={() => handleAssignProposals(proposal)}
                                key={index}
                                className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 space-y-3 hover:border-green-400/50 transition-colors"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Freelancer</div>
                                        <div
                                            onClick={() => window.open(`https://suiscan.xyz/testnet/account/${proposal.fields.freelancer}`, '_blank')}
                                            className="font-mono text-green-400 text-sm cursor-pointer hover:underline">{proposal.fields.freelancer.substring(0, 12)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Proposed At</div>
                                        <div className="text-sm">{new Date(proposal.fields.proposed_at * 1000).toLocaleDateString()}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-2 border-y border-gray-700/50">
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Bid Amount</div>
                                        <div className="text-lg font-bold text-white">{proposal.fields.bid_amount} SUI</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Delivery Time</div>
                                        <div className="text-lg font-bold text-white">{proposal.fields.delivery_time} Days</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Cover Letter</div>
                                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap italic">
                                        "{proposal.fields.cover_letter}"
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-8">
                    <button
                        onClick={onClose}
                        className="w-full rounded-lg bg-gray-700 px-6 py-3 font-bold text-white transition hover:bg-gray-600"
                    >
                        CLOSE
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ProposalsListModal;
