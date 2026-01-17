import React, { useState } from "react";
import { motion } from "framer-motion";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { toast } from "@/hooks/use-toast";
import { submitProposal } from "@/blockchain/taskHandler";

interface SubmitProposalModalProps {
    taskId: string;
    onClose: () => void;
}

const SubmitProposalModal: React.FC<SubmitProposalModalProps> = ({ taskId, onClose }) => {
    const [bidAmount, setBidAmount] = useState('');
    const [deliveryTime, setDeliveryTime] = useState('');
    const [coverLetter, setCoverLetter] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    const handleSubmit = async () => {
        try {
            if (!bidAmount || !deliveryTime || !coverLetter) {
                toast({
                    title: 'Error',
                    description: 'Please fill in all fields',
                    variant: 'destructive',
                });
                return;
            }

            setIsSubmitting(true);

            const tx = submitProposal(
                taskId,
                Number(bidAmount),
                Number(deliveryTime),
                coverLetter
            );

            signAndExecuteTransaction(
                { transaction: tx },
                {
                    onSuccess: (result) => {
                        console.log('Proposal submitted:', result);
                        toast({
                            title: 'Success',
                            description: 'Proposal submitted successfully!',
                        });
                        onClose();
                    },
                    onError: (error) => {
                        console.error('Proposal submission failed:', error);
                        toast({
                            title: 'Error',
                            description: 'Failed to submit proposal',
                            variant: 'destructive',
                        });
                    },
                }
            );
        } catch (error) {
            console.error('Error in handleSubmit:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-white"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-2xl border-2 border-green-400 bg-gray-900 p-8 shadow-2xl"
            >
                <h2 className="mb-6 text-2xl font-bold uppercase text-green-400">Submit Proposal</h2>

                <div className="space-y-4">
                    {/* Bid Amount */}
                    <div>
                        <label className="mb-2 block text-sm font-bold text-gray-400">Bid Amount (SUI)</label>
                        <input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 focus:border-green-400 focus:outline-none"
                            placeholder="e.g. 100"
                        />
                    </div>

                    {/* Delivery Time */}
                    <div>
                        <label className="mb-2 block text-sm font-bold text-gray-400">Delivery Time (Days)</label>
                        <input
                            type="number"
                            value={deliveryTime}
                            onChange={(e) => setDeliveryTime(e.target.value)}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 focus:border-green-400 focus:outline-none"
                            placeholder="e.g. 7"
                        />
                    </div>

                    {/* Cover Letter */}
                    <div>
                        <label className="mb-2 block text-sm font-bold text-gray-400">Cover Letter</label>
                        <textarea
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            rows={6}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 focus:border-green-400 focus:outline-none"
                            placeholder="Why are you the best fit for this task?"
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div className="mt-8 flex gap-4">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg bg-gray-700 px-6 py-3 font-bold text-white transition hover:bg-gray-600 disabled:opacity-50"
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg bg-green-500 px-6 py-3 font-bold text-black transition hover:bg-green-600 disabled:opacity-50"
                    >
                        {isSubmitting ? 'SUBMITTING...' : 'SUBMIT PROPOSAL'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SubmitProposalModal;
