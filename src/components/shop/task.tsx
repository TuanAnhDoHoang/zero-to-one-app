import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import './shop_style.css';
import { useCurrentAccount, useSignAndExecuteTransaction, useSignPersonalMessage } from "@mysten/dapp-kit";
import { toast } from "@/hooks/use-toast";
import SubmitProposalModal from "./SubmitProposalModal";
import ProposalsListModal from "./ProposalsListModal";
import { cancelTask, completeTask, startTask, submitWork, TaskModule } from "@/blockchain/taskHandler";
import { randomBytes } from "crypto";
import { fromHex, toHex } from "@mysten/sui/utils";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { SealClient, SessionKey } from "@mysten/seal";
import { Transaction } from "@mysten/sui/transactions";
import console from "console";
import { Check } from "lucide-react";

export const STATUS_OPEN: number = 0;
export const STATUS_ASSIGNED: number = 1;
export const STATUS_IN_PROGRESS: number = 2;
export const STATUS_SUBMITTED: number = 3;
export const STATUS_COMPLETED: number = 4;
export const STATUS_DISPUTED: number = 5;
export const STATUS_CANCELLED: number = 6;
// id: UID,
//     client: address, //địa chỉ người giao task
//     assigned_freelancer: Option<address>, //
//     title: String,
//     description: String,
//     hourly_rate: Option<u64>, // In SUI (MIST)
//     fixed_price: Option<u64>, // In SUI (MIST)
//     duration: String, // e.g., "1-3 months"
//     experience_level: String, // "", "Intermediate", "Expert"
//     skills: vector<String>,
//     tools: vector<String>,
//     posted_time: u64,
//     proposals: vector<Proposal>,
//     payment_verified: bool,
//     escrow_balance: Balance<SUI>, // Funds held in escrow
//     location: String,
//     project_type: String, // "Fixed", "Hourly"
//     status: u8,
//     deadline: Option<u64>,
//     client_info: ClientInfo,
export interface Task {
    id: string;
    title: string;
    client: string;
    description: string;
    hourlyRate?: string; //smart contract
    fixedPrice?: string;
    duration: string;
    experienceLevel: string;
    skills: string[];
    tools?: string[];
    postedTime: string;
    proposals: {
        fields: {
            freelancer: string, //địa chỉ của Nô lệ
            bid_amount: number, //giá refer
            delivery_time: number, // In days - chuyển ngày:tháng:năm thành số  - deadline
            cover_letter: string, //giới thiệu
            proposed_at: number, //thời gian submit
        };//smart contract
        type: string,
    }[]
    assigned_freelancer?: string;
    paymentVerified: boolean;
    escrowBalance: string;
    location: string;
    projectType: string;
    status: number;
    deadline: number;
    clientInfo: {
        jobsPosted: number;
        hireRate: string;
        openJobs: number;
        memberSince: string;
    };
}
// Mock task data based on Upwork examples
// export const MOCK_TASKS: Task[] = [
//     {
//         id: '1',
//         title: 'TikTok Signature Tool Developer',
//         description: 'We are seeking a skilled developer to create a tool for generating X-Argus signatures for TikTok API requests. The ideal candidate should have experience with NodeJS or Python, TikTok APIs, and cryptographic algorithms. The task involves developing scripts for dynamic signature generation and providing comprehensive documentation and testing support.',
//         hourlyRate: 'Hourly',
//         duration: 'Less than 1 month, Less than 30 hrs/week',
//         experienceLevel: 'Intermediate',
//         skills: ['Reverse Engineering'],
//         tools: ['NodeJS', 'Python'],
//         postedTime: 'Posted 20 hours ago',
//         proposals: [
//             {
//                 freelancer: '0x123...',
//                 bid_amount: 100,
//                 delivery_time: 10,
//                 cover_letter: 'I am a skilled developer with experience in NodeJS and Python.',
//                 proposed_at: 1672531200
//             }
//         ],
//         paymentVerified: true,
//         location: 'United Arab Emirates',
//         projectType: 'One-time project',
//         clientInfo: {
//             jobsPosted: 1,
//             hireRate: '0%',
//             openJobs: 1,
//             memberSince: 'Apr 15, 2025'
//         }
//     },
//     {
//         id: '2',
//         title: 'Web3 Smart Contract Developer',
//         description: 'Looking for an experienced Solidity developer to build and audit smart contracts for our DeFi platform. Must have experience with ERC-20, ERC-721, and complex DeFi protocols.',
//         fixedPrice: '$5,000 - $10,000',
//         duration: '1 to 3 months',
//         experienceLevel: 'Expert',
//         skills: ['Solidity', 'Smart Contracts', 'Web3', 'DeFi'],
//         tools: ['Hardhat', 'Truffle', 'Ethers.js'],
//         postedTime: 'Posted 2 days ago',
//         proposals: '10 to 15',
//         paymentVerified: true,
//         location: 'Worldwide',
//         projectType: 'One-time project',
//         clientInfo: {
//             jobsPosted: 5,
//             hireRate: '80%',
//             openJobs: 2,
//             memberSince: 'Jan 10, 2024'
//         }
//     },
//     {
//         id: '3',
//         title: 'React + Three.js Game Developer',
//         description: 'Need a creative developer to build an interactive 3D game using React and Three.js. The game should have smooth animations, particle effects, and responsive controls.',
//         hourlyRate: '$50-$80/hr',
//         duration: '2 to 4 weeks',
//         experienceLevel: 'Intermediate',
//         skills: ['React', 'Three.js', 'WebGL', 'Game Development'],
//         tools: ['React', 'Three.js', 'Blender'],
//         postedTime: 'Posted 5 hours ago',
//         proposals: '3 to 5',
//         paymentVerified: true,
//         location: 'United States',
//         projectType: 'Ongoing project',
//         clientInfo: {
//             jobsPosted: 12,
//             hireRate: '92%',
//             openJobs: 3,
//             memberSince: 'Mar 20, 2023'
//         }
//     }
// ];

// TaskCard Component - Upwork style with game aesthetics
interface TaskCardProps {
    userProfileId: string;
    task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ userProfileId, task }) => {
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showProposalModal, setShowProposalModal] = useState(false);
    const [showProposalsModal, setShowProposalsModal] = useState(false);
    const [applyCondition, setApplyCondition] = useState(true);
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const currAccount = useCurrentAccount();
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [taskSubmits, setTaskSubmits] = useState<{ id: string, quiltId: string, sealId: Uint8Array }[]>([]);
    const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);

    const { mutate: signPersonalMessage } = useSignPersonalMessage();
    //seal
    const serverObjectIds = ["0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75", "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8"];
    const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
    const client = new SealClient({
        suiClient,
        serverConfigs: serverObjectIds.map((id) => ({
            objectId: id,
            weight: 1,
        })),
        verifyKeyServers: false,
    });

    const handleApply = () => {
        if (!currAccount) {
            toast({
                title: "Error",
                description: "Please connect your wallet",
                variant: "destructive",
            });
            return;
        }
        setShowProposalModal(true);
    }
    const handleOpenProposalsModal = () => {
        setShowProposalsModal(true);
    }
    const handleCancel = () => {
        if (!currAccount) {
            toast({
                title: "Error",
                description: "Please connect your wallet",
                variant: "destructive",
            });
            return;
        }
        const tx = cancelTask(task.id);
        signAndExecuteTransaction({
            transaction: tx
        }, {
            onSuccess: () => {
                toast({
                    title: "Success",
                    description: "Task cancelled successfully",
                    variant: "default",
                });
                setShowDetailsModal(false);
            },
            onError: () => {
                toast({
                    title: "Error",
                    description: "Failed to cancel task",
                    variant: "destructive",
                });
            }
        });
    }
    useEffect(() => {
        setApplyCondition(task.client !== currAccount?.address &&
            task.status === 0 &&
            !task.assigned_freelancer
        )
    }, [task]);


    const encryptFile = async (file: File, sealId: Uint8Array) => {
        const fileBytes = new Uint8Array(await file.arrayBuffer());
        const { encryptedObject: encryptedBytes, key: backupKey } = await client.encrypt({
            threshold: 1,
            packageId: toHex(fromHex(import.meta.env.VITE_PID)),
            id: toHex(sealId),
            data: fileBytes
        });
        return { encryptedBytes, backupKey };
    }
    const handleSubmitWork = async () => {
        if (!currAccount) {
            toast({
                title: "Error",
                description: "Please connect your wallet",
                variant: "destructive",
            });
            return;
        }
        if (!file) {
            toast({
                title: "Error",
                description: "Please select a file",
                variant: "destructive",
            });
            return;
        }

        const sealId = randomBytes(32);
        const { encryptedBytes } = await encryptFile(file, sealId);
        const uploadResponse = await fetch(`${import.meta.env.VITE_ENDPOINT}/projects/upload-file`, {
            method: 'POST',
            body: JSON.stringify({ encryptedBytes: encryptedBytes, address: task.client }),
            headers: {
                'Content-Type': 'application/json',
            }
        })
        const uploadData = await uploadResponse.json();
        console.log('upload response: ', uploadData);
        const quiltId = uploadData.response;

        if (!quiltId) {
            toast({
                title: "Error",
                description: "Failed to upload file to Walrus (Service Unavailable)",
                variant: "destructive",
            });
            return;
        }

        const tx = submitWork(task.id, quiltId, sealId);
        signAndExecuteTransaction({
            transaction: tx
        }, {
            onSuccess: () => {
                toast({
                    title: "Success",
                    description: "Work submitted successfully",
                    variant: "default",
                });
                setShowDetailsModal(false);
            },
            onError: () => {
                toast({
                    title: "Error",
                    description: "Failed to submit work",
                    variant: "destructive",
                });
            }
        });
    }
    const handleStartTask = () => {
        const tx = startTask(task.id);
        signAndExecuteTransaction({
            transaction: tx
        }, {
            onSuccess: () => {
                toast({
                    title: "Success",
                    description: "Task started successfully",
                    variant: "default",
                });
                setShowDetailsModal(false);
            },
            onError: () => {
                toast({
                    title: "Error",
                    description: "Failed to start task",
                    variant: "destructive",
                });
            }
        });
    }
    useEffect(() => {
        const fetchTaskSubmit = async () => {
            if (!currAccount) {
                toast({
                    title: "Error",
                    description: "Please connect your wallet",
                    variant: "destructive",
                });
                return;
            }
            if (showDetailsModal) {
                const taskSubmit = await suiClient.getOwnedObjects({
                    owner: currAccount.address,
                    filter: {
                        StructType: `${import.meta.env.VITE_PID}::${TaskModule}::TaskSubmit`
                    },
                    options: {
                        showContent: true
                    }
                });
                const response = taskSubmit.data.filter(t => {
                    if ((t.data?.content as any)?.fields.task_id as string === task.id) {
                        return true;
                    }
                    return false;
                });
                const taskSubmits = response.map((t) => ({
                    id: t.data?.objectId,
                    quiltId: (t.data?.content as any)?.fields?.quilt_id,
                    sealId: new Uint8Array((t.data?.content as any)?.fields?.seal_id || []),
                })).filter((t): t is { id: string; quiltId: string; sealId: Uint8Array } => t.id !== undefined && t.quiltId !== undefined && t.sealId !== undefined);
                console.log('taskSubmits: ', taskSubmits);
                if (taskSubmits.length > 0 && taskSubmits[0].id !== task.id) {
                    setTaskSubmits(taskSubmits);
                }
            }
        }
        fetchTaskSubmit();
    }, [task, currAccount, showDetailsModal]);
    const getSessionKey = async () => {
        if (!currAccount) {
            console.error('No current account found');
            return;
        }
        const pid = import.meta.env.VITE_PID;
        const sessionKey = await SessionKey.create({
            address: currAccount.address,
            packageId: pid,
            ttlMin: 30, // TTL of 30 minutes
            suiClient: suiClient,
        });
        const message = sessionKey.getPersonalMessage();

        await new Promise<void>((resolve, reject) => {
            signPersonalMessage({ message: message }, {
                onSuccess: async (result) => {
                    await sessionKey.setPersonalMessageSignature(result.signature);
                    resolve();
                },
                onError: (error) => {
                    console.error('Failed to sign personal message:', error);
                    reject(error);
                },
            });
        });
        return sessionKey;
    }
    const handleDownload = async (submitTask: { id: string, quiltId: string, sealId: Uint8Array }) => {
        try {
            if (!currAccount) {
                toast({
                    title: "Error",
                    description: "Please connect your wallet",
                    variant: "destructive",
                });
                return;
            }
            const response = await fetch(`${import.meta.env.VITE_ENDPOINT}/projects/download/${submitTask.quiltId}`);
            if (!response.ok) throw new Error('Download failed from backend');

            const arrayBuffer = await response.arrayBuffer();
            const tx = new Transaction();
            tx.setGasBudget(1_000_000_000);
            tx.setSender(currAccount.address);
            tx.moveCall({
                target: `${import.meta.env.VITE_PID}::seal_policy_task::seal_approve`,
                arguments: [
                    tx.pure.vector('u8', submitTask.sealId),
                    tx.object(submitTask.id)
                ]
            })
            const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
            const data = new Uint8Array(arrayBuffer);
            const sessionKey = await getSessionKey();
            if (!sessionKey) {
                toast({
                    title: "Error",
                    description: "Failed to get session key",
                    variant: "destructive",
                });
                return;
            }
            const decrypted = await client.decrypt({
                data: data,
                sessionKey,
                txBytes
            });
            console.log('decrypted: ', decrypted);

            const blob = new Blob([decrypted as any]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `submission-${submitTask.quiltId.substring(0, 6)}.bin`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Success",
                description: "File downloaded successfully",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to download file",
                variant: "destructive",
            });
        }
    }
    const handleCheckTaskCompleted = (taskSubmitId: string) => {
        if (!userProfileId) {
            toast({
                title: "Error",
                description: "Please login to check task completed",
                variant: "destructive",
            });
            return;
        }
        const tx = completeTask(
            task.id,
            userProfileId,
            taskSubmitId
        )
        signAndExecuteTransaction({
            transaction: tx,
        }, {
            onSuccess: () => {
                toast({
                    title: "Success",
                    description: "Task completed successfully",
                });
                setShowSubmissionsModal(false);
            },
            onError: (error) => {
                console.error(error);
                toast({
                    title: "Error",
                    description: "Failed to complete task",
                    variant: "destructive",
                });
            }
        });
    }
    return (
        <>
            <div
                onClick={() => setShowDetailsModal(true)}
                className="cursor-pointer overflow-hidden rounded-xl border-2 border-gray-700 bg-gray-900 shadow-lg transition-all hover:border-yellow-400 hover:shadow-yellow-400/30 hover:scale-[1.02] p-6"
            >
                {/* Header */}
                <div className="mb-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-xl font-bold text-green-400 hover:underline flex-1">
                            {task.title}
                        </h3>
                        <div className="flex gap-2 flex-shrink-0">
                            <button className="text-gray-400 hover:text-white transition">
                                <span className="text-2xl">💬</span>
                            </button>
                            <button className="text-gray-400 hover:text-red-400 transition">
                                <span className="text-2xl">❤️</span>
                            </button>
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{task.postedTime}</p>
                    <p className="text-sm text-gray-300 mb-3">
                        {task.hourlyRate && <span className="font-bold">{task.hourlyRate}</span>}
                        {task.fixedPrice && <span className="font-bold text-green-400">{task.fixedPrice}</span>}
                        {task.hourlyRate && task.duration && <span> - </span>}
                        {task.duration && <span>{task.duration}</span>}
                    </p>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-300 mb-4 line-clamp-3 leading-relaxed">
                    {task.description}
                </p>

                {/* Skills */}
                {task.skills && task.skills.length > 0 && (
                    <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                            {task.skills.map((skill, idx) => (
                                <span
                                    key={idx}
                                    className="rounded-full bg-gray-800 px-3 py-1 text-xs font-bold text-gray-300 border border-gray-700"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                        {task.paymentVerified && (
                            <div className="flex items-center gap-1">
                                <span className="text-blue-400">✓</span>
                                <span>Payment verified</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <span>📍</span>
                            <span>{task.location}</span>
                        </div>
                    </div>
                    <div className="text-xs text-gray-400">
                        Proposals: <span className="text-green-400 font-bold">{task.proposals.length}</span>
                    </div>
                </div>
            </div>

            {/* Task Details Modal */}
            {showDetailsModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setShowDetailsModal(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-4xl w-full rounded-2xl border-2 border-yellow-400 bg-gray-900 shadow-2xl max-h-[90vh] overflow-y-auto"
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-gray-900 border-b-2 border-gray-800 p-6 z-10">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold uppercase text-green-400 mb-2">
                                        {task.title}
                                    </h2>
                                    <p className="text-sm text-gray-400">{task.postedTime}</p>
                                </div>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-2xl text-gray-400 hover:text-white flex-shrink-0"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {/* Summary Section */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-yellow-400 mb-3">SUMMARY</h3>
                                <p className="text-gray-300 leading-relaxed">{task.description}</p>
                            </div>

                            {/* Job Details */}
                            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl">⏱️</span>
                                        <span className="text-xs text-gray-400">Duration</span>
                                    </div>
                                    <p className="text-sm font-bold text-white">{task.duration}</p>
                                </div>
                                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl">📅</span>
                                        <span className="text-xs text-gray-400">Experience Level</span>
                                    </div>
                                    <p className="text-sm font-bold text-white">{task.experienceLevel}</p>
                                </div>
                                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl">💼</span>
                                        <span className="text-xs text-gray-400">Project Type</span>
                                    </div>
                                    <p className="text-sm font-bold text-white">{task.projectType}</p>
                                </div>
                            </div>

                            {/* Skills and Expertise */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-yellow-400 mb-3">SKILLS AND EXPERTISE</h3>
                                <div className="mb-4">
                                    <p className="text-sm text-gray-400 mb-2">Mandatory skills</p>
                                    <div className="flex flex-wrap gap-2">
                                        {task.skills.map((skill, idx) => (
                                            <span
                                                key={idx}
                                                className="rounded-full bg-gray-800 px-4 py-2 text-sm font-bold text-gray-300 border border-gray-600"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {task.tools && task.tools.length > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-400 mb-2">Tools</p>
                                        <div className="flex flex-wrap gap-2">
                                            {task.tools.map((tool, idx) => (
                                                <span
                                                    key={idx}
                                                    className="rounded-full bg-gray-800 px-4 py-2 text-sm font-bold text-gray-300 border border-gray-600"
                                                >
                                                    {tool}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Activity on this job */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-yellow-400 mb-3">ACTIVITY ON THIS JOB</h3>
                                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Proposals:</span>
                                        <span
                                            onClick={handleOpenProposalsModal}
                                            className="text-green-400 font-bold flex items-center gap-1 flex gap-2 items-center justify-center cursor-pointer hover:underline">
                                            <span className="text-green-400">◉</span> {task.proposals.length}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* About the client */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-yellow-400 mb-3">ABOUT THE CLIENT</h3>
                                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 space-y-3">
                                    {task.paymentVerified && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-green-400">✓</span>
                                            <span className="text-gray-300">Payment method verified</span>
                                        </div>
                                    )}
                                    <div className="text-sm text-gray-300">
                                        <p className="mb-1">{task.location}</p>
                                        <p className="mb-1">{task.clientInfo.jobsPosted} job posted</p>
                                        <p className="mb-1">{task.clientInfo.hireRate} hire rate, {task.clientInfo.openJobs} open job</p>
                                        <p className="text-gray-400">Member since {task.clientInfo.memberSince}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 sticky bottom-0 bg-gray-900 pt-4 border-t-2 border-gray-800">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="flex-1 rounded-lg bg-gray-700 px-6 py-3 font-bold text-white transition-all hover:bg-gray-600"
                                >
                                    CLOSE
                                </button>
                                <button className="flex-1 rounded-lg border-2 border-green-400 px-6 py-3 font-bold text-green-400 transition-all hover:bg-green-400 hover:text-black">
                                    SAVE JOB
                                </button>
                                {
                                    applyCondition &&
                                    (
                                        <button
                                            onClick={handleApply}
                                            className="flex-1 rounded-lg bg-green-500 px-6 py-3 font-bold text-black transition-all hover:bg-green-600">
                                            APPLY NOW
                                        </button>
                                    )
                                }
                                {task.assigned_freelancer === currAccount?.address && (
                                    <>
                                        {task.status === STATUS_ASSIGNED && (
                                            // ← add your content for status = 1 here
                                            // e.g. <div>Waiting for freelancer to start...</div>
                                            <div
                                                onClick={handleStartTask}
                                                className="flex-1 rounded-lg bg-yellow-500 px-6 py-3 font-bold text-black transition-all hover:bg-green-600 text-center">Start</div>
                                        )}

                                        {task.status === STATUS_IN_PROGRESS && (
                                            <>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            setFile(e.target.files[0]);
                                                        }
                                                    }}
                                                />

                                                {!file ? (
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="flex-1 rounded-lg bg-blue-500 px-6 py-3 font-bold text-white transition-all hover:bg-blue-600"
                                                    >
                                                        UPLOAD WORK
                                                    </button>
                                                ) : (
                                                    <div className="flex flex-1 gap-2">
                                                        <button
                                                            onClick={handleSubmitWork}
                                                            className="flex-1 rounded-lg bg-green-500 px-6 py-3 font-bold text-black transition-all hover:bg-green-600"
                                                        >
                                                            SUBMIT {file.name.substring(0, 10)}...
                                                        </button>
                                                        <button
                                                            onClick={() => setFile(null)}
                                                            className="px-4 rounded-lg bg-red-500 font-bold text-white hover:bg-red-600"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                                {
                                    task.client === currAccount?.address && (
                                        <div className="flex gap-2">
                                            {taskSubmits.length > 0 && (
                                                <button
                                                    onClick={() => setShowSubmissionsModal(true)}
                                                    className="flex-1 rounded-lg bg-blue-500 px-6 py-3 font-bold text-white transition-all hover:bg-blue-600">
                                                    VIEW SUBMISSIONS
                                                </button>
                                            )}
                                            <button
                                                disabled={task.status !== 0}
                                                onClick={handleCancel}
                                                className="flex-1 rounded-lg bg-red-500 px-6 py-3 font-bold text-black transition-all hover:bg-green-600">
                                                CANCEL
                                            </button>
                                        </div>
                                    )
                                }

                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            {/* Submit Proposal Modal */}
            {showProposalModal && (
                <SubmitProposalModal
                    taskId={task.id}
                    onClose={() => setShowProposalModal(false)}
                />
            )}
            {showProposalsModal && (
                <ProposalsListModal
                    taskId={task.id}
                    client={task.client}
                    taskStatus={task.status}
                    proposals={task.proposals}
                    onClose={() => setShowProposalsModal(false)}
                />
            )}
            {
                showSubmissionsModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => setShowSubmissionsModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md rounded-2xl border-2 border-blue-400 bg-gray-900 shadow-2xl overflow-hidden"
                        >
                            <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-blue-400">Submissions</h3>
                                <button
                                    onClick={() => setShowSubmissionsModal(false)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-4 space-y-3">
                                {taskSubmits.map((submit, idx) => (
                                    <div key={idx} className="flex flex-col gap-4 items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700">
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-gray-300 truncate w-80">
                                                Quilt ID: {submit.quiltId}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDownload(submit)}
                                                className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors flex-shrink-0"
                                                title="Download"
                                            >
                                                ⬇️
                                            </button>
                                            {task.status === STATUS_SUBMITTED && (
                                                <button onClick={() => handleCheckTaskCompleted(submit.id)}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors text-xs font-bold whitespace-nowrap"
                                                >
                                                    <Check className="w-4 h-4" /> Check task completed
                                                </button>
                                            )}
                                            {task.status === STATUS_COMPLETED && (
                                                <button
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors text-xs font-bold whitespace-nowrap"
                                                >
                                                    Completed
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {taskSubmits.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">No submissions yet.</p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )
            }
        </>
    );
};
export default TaskCard;