import React, { useState } from "react";
import { motion } from "framer-motion";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { toast } from "@/hooks/use-toast";
import { createFixedPriceTask, createHourlyTask } from "@/blockchain/taskHandler";

interface SubmitTaskModalProps {
    onClose: () => void;
}

const SubmitTaskModal: React.FC<SubmitTaskModalProps> = ({ onClose }) => {
    const [taskType, setTaskType] = useState<'fixed' | 'hourly'>('fixed');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState(''); // Maps to fixedPrice or hourlyRate
    const [duration, setDuration] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('Entry');
    const [skills, setSkills] = useState('');
    const [tools, setTools] = useState('');
    const [location, setLocation] = useState('Remote');
    const [payment, setPayment] = useState(''); // Amount to deposit
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    const handleSubmit = async () => {
        try {
            if (!title || !description || !budget || !payment) {
                toast({
                    title: 'Error',
                    description: 'Please fill in all required fields',
                    variant: 'destructive',
                });
                return;
            }

            setIsSubmitting(true);

            const skillsList = skills.split(',').map(s => s.trim()).filter(s => s);
            const toolsList = tools.split(',').map(t => t.trim()).filter(t => t);

            let tx;
            if (taskType === 'fixed') {
                tx = createFixedPriceTask(
                    title,
                    description,
                    Number(budget), // fixedPrice
                    duration,
                    experienceLevel,
                    skillsList,
                    toolsList,
                    location,
                    Number(payment) // payment coin amount
                );
            } else {
                tx = createHourlyTask(
                    title,
                    description,
                    Number(budget), // hourlyRate
                    duration,
                    experienceLevel,
                    skillsList,
                    toolsList,
                    location,
                    Number(payment) // payment coin amount
                );
            }

            signAndExecuteTransaction(
                { transaction: tx },
                {
                    onSuccess: (result) => {
                        console.log('Task created:', result);
                        toast({
                            title: 'Success',
                            description: 'Task submitted successfully!',
                        });
                        onClose();
                    },
                    onError: (error) => {
                        console.error('Task creation failed:', error);
                        toast({
                            title: 'Error',
                            description: 'Failed to submit task',
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
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-yellow-400 bg-gray-900 p-8 shadow-2xl scrollbar-hide"
            >
                <h2 className="mb-6 text-3xl font-bold uppercase text-yellow-400">Submit New Task</h2>

                {/* Task Type Toggle */}
                <div className="mb-6 flex rounded-lg bg-gray-800 p-1">
                    <button
                        onClick={() => setTaskType('fixed')}
                        className={`flex-1 rounded-md py-2 font-bold transition ${taskType === 'fixed' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Fixed Price
                    </button>
                    <button
                        onClick={() => setTaskType('hourly')}
                        className={`flex-1 rounded-md py-2 font-bold transition ${taskType === 'hourly' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Hourly Rate
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="mb-2 block text-sm font-bold text-gray-400">Task Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 focus:border-yellow-400 focus:outline-none"
                            placeholder="e.g. Build a DeFi Dashboard"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="mb-2 block text-sm font-bold text-gray-400">Description *</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 focus:border-yellow-400 focus:outline-none"
                            placeholder="Detailed description of the task..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Budget/Rate */}
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-400">
                                {taskType === 'fixed' ? 'Fixed Price (SUI) *' : 'Hourly Rate (SUI/hr) *'}
                            </label>
                            <input
                                type="number"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 focus:border-yellow-400 focus:outline-none"
                                placeholder="0.0"
                            />
                        </div>

                        {/* Payment Deposit */}
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-400">Deposit Amount (SUI) *</label>
                            <input
                                type="number"
                                value={payment}
                                onChange={(e) => setPayment(e.target.value)}
                                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 focus:border-yellow-400 focus:outline-none"
                                placeholder="Initial deposit"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Duration */}
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-400">Duration</label>
                            <input
                                type="text"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 focus:border-yellow-400 focus:outline-none"
                                placeholder="e.g. 2 weeks"
                            />
                        </div>

                        {/* Experience Level */}
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-400">Experience Level</label>
                            <select
                                value={experienceLevel}
                                onChange={(e) => setExperienceLevel(e.target.value)}
                                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 focus:border-yellow-400 focus:outline-none text-white"
                            >
                                <option value="Entry">Entry Level</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Expert">Expert</option>
                            </select>
                        </div>
                    </div>

                    {/* Skills */}
                    <div>
                        <label className="mb-2 block text-sm font-bold text-gray-400">Skills (comma separated)</label>
                        <input
                            type="text"
                            value={skills}
                            onChange={(e) => setSkills(e.target.value)}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 focus:border-yellow-400 focus:outline-none"
                            placeholder="React, Rust, Move..."
                        />
                    </div>

                    {/* Tools */}
                    <div>
                        <label className="mb-2 block text-sm font-bold text-gray-400">Tools (comma separated)</label>
                        <input
                            type="text"
                            value={tools}
                            onChange={(e) => setTools(e.target.value)}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 focus:border-yellow-400 focus:outline-none"
                            placeholder="VS Code, Figma..."
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label className="mb-2 block text-sm font-bold text-gray-400">Location</label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 focus:border-yellow-400 focus:outline-none"
                            placeholder="Remote, NY, etc."
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
                        className="flex-1 rounded-lg bg-yellow-400 px-6 py-3 font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50"
                    >
                        {isSubmitting ? 'SUBMITTING...' : 'SUBMIT PROJECT'}
                    </button>
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-2xl text-gray-400 hover:text-white"
                >
                    ✕
                </button>
            </motion.div>
        </motion.div>
    );
};

export default SubmitTaskModal;
