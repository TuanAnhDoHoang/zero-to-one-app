import { Transaction } from "@mysten/sui/transactions";

export interface ClientInfo {
    jobsPosted: number;
    hireRate: number;
    openJobs: number;
    totalSpent: number;
    memberSince: number;
}

export interface FreelancerInfo {
    jobsCompleted: number;
    successRate: number;
    totalEarned: number;
    memberSince: number;
}

export interface Proposal {
    freelancer: string;
    bidAmount: number;
    deliveryTime: number;
    coverLetter: string;
    proposedAt: number;
}

export interface Task {
    id: string;
    client: string;
    assignedFreelancer: string | null;
    title: string;
    description: string;
    hourlyRate: number | null;
    fixedPrice: number | null;
    duration: string;
    experienceLevel: string;
    skills: string[];
    tools: string[];
    postedTime: number;
    proposals: Proposal[];
    paymentVerified: boolean;
    escrowBalance: number;
    location: string;
    projectType: string;
    status: number;
    deadline: number | null;
    clientInfo: ClientInfo;
}

export interface UserProfile {
    id: string;
    owner: string;
    name: string;
    bio: string;
    clientInfo: ClientInfo | null;
    freelancerInfo: FreelancerInfo | null;
    createdAt: number;
}

export interface Platform {
    id: string;
    totalTasks: number;
    totalCompleted: number;
    totalVolume: number;
    platformFee: number;
    feeBalance: number;
}

export interface PlatformCap {
    id: string;
}

const PLATFORM_ID = "0x754539dfb7d17ebca4da4e66e3c88ece2e01611cf3b7507fa81ce1fbebe1450c";
//test package Id
const PACKAGE_ID = "0x9e30d8757c19a68ada3c8d0d750f6ba277a51d161759fa0452a79dd0038dc62b"
const MODULE_TASK = 'task';
const UserProfile_TYPE = 'UserProfile'

function createNewProfile(name: string, bio: string) {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_TASK}::create_profile`,
        arguments: [
            tx.pure.string(name),
            tx.pure.string(bio),
            tx.object.clock(),
        ],
    });
    return tx;
}
function registerClient(userProfileId: string) {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_TASK}::register_as_client`,
        arguments: [
            tx.object(userProfileId),
            tx.object.clock(),
        ],
    });
    return tx;
}
function registerFreelancer(userProfileId: string) {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_TASK}::register_as_freelancer`,
        arguments: [
            tx.object(userProfileId),
            tx.object.clock(),
        ],
    });
    return tx;
}

// public fun create_fixed_price_task(
//     platform: &mut Platform,
//     title: vector<u8>,
//     description: vector<u8>,
//     fixed_price: u64,
//     duration: vector<u8>,
//     experience_level: vector<u8>,
//     skills: vector<String>,
//     tools: vector<String>,
//     location: vector<u8>,
//     payment: Coin<SUI>,
//     clock: &Clock,
//     ctx: &mut TxContext,
// )
function createFixedPriceTask(
    title: string,
    description: string,
    fixedPrice: number,
    duration: string,
    experienceLevel: string,
    skills: string[],
    tools: string[],
    location: string,
    payment: number,
) {

    const tx = new Transaction();
    const coin = tx.splitCoins(tx.gas, [tx.pure.u64(payment)]);
    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_TASK}::create_fixed_price_task`,
        arguments: [
            tx.object(PLATFORM_ID),
            tx.pure.string(title),
            tx.pure.string(description),
            tx.pure.u64(fixedPrice),
            tx.pure.string(duration),
            tx.pure.string(experienceLevel),
            tx.pure.vector('string', skills),
            tx.pure.vector('string', tools),
            tx.pure.string(location),
            coin,
            tx.object.clock(),
        ],
    });
    return tx;
}
function createHourlyTask(
    title: string,
    description: string,
    hourlyRate: number,
    duration: string,
    experienceLevel: string,
    skills: string[],
    tools: string[],
    location: string,
    payment: number,
) {
    const tx = new Transaction();
    const coin = tx.splitCoins(tx.gas, [tx.pure.u64(payment)]);
    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_TASK}::create_hourly_task`,
        arguments: [
            tx.pure.string(title),
            tx.pure.string(description),
            tx.pure.u64(hourlyRate),
            tx.pure.string(duration),
            tx.pure.string(experienceLevel),
            tx.pure.vector('string', skills),
            tx.pure.vector('string', tools),
            tx.pure.string(location),
            coin,
            tx.object.clock(),
        ],
    });
    return tx;
}
// public fun submit_proposal(
//     task: &mut Task,
//     bid_amount: u64,
//     delivery_time: u64,
//     cover_letter: vector<u8>,
//     clock: &Clock,
//     ctx: &mut TxContext,
// )
function submitProposal(
    taskId: string,
    bidAmount: number,
    deliveryTime: number,
    coverLetter: string,
) {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_TASK}::submit_proposal`,
        arguments: [
            tx.object(taskId),
            tx.pure.u64(bidAmount),
            tx.pure.u64(deliveryTime),
            tx.pure.string(coverLetter),
            tx.object.clock(),
        ],
    });
    return tx;
}

// public fun assign_task(
//     task: &mut Task,
//     freelancer: address,
//     deadline_days: u64,
//     clock: &Clock,
//     ctx: &mut TxContext,
// )
function assignTask(
    taskId: string,
    freelancer: string,
    deadlineDays: number,
) {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_TASK}::assign_task`,
        arguments: [
            tx.object(taskId),
            tx.pure.address(freelancer),
            tx.pure.u64(deadlineDays),
            tx.object.clock(),
        ],
    });
    return tx;
}
// public fun start_task(
//     task: &mut Task,
//     ctx: &mut TxContext,
// )
function startTask(
    taskId: string,
) {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_TASK}::start_task`,
        arguments: [
            tx.object(taskId),
        ],
    });
    return tx;
}
// public fun submit_work(
//     task: &mut Task,
//     ctx: &mut TxContext,
// )
function submitWork(taskId: string, quilt_id: string, seal_id: Uint8Array) {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_TASK}::submit_work`,
        arguments: [
            tx.object(taskId),
            tx.pure.string(quilt_id),
            tx.pure.vector('u8', seal_id),
        ],
    });
    return tx;
}
// public fun complete_task(
//     task: &mut Task,
//     platform: &mut Platform,
//     profile: &mut UserProfile,
//     clock: &Clock,
//     ctx: &mut TxContext,
// )
function completeTask(taskId: string, userProfileId: string) {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_TASK}::complete_task`,
        arguments: [
            tx.object(taskId),
            tx.object(PLATFORM_ID),
            tx.object(userProfileId),
            tx.object.clock(),
        ],
    });
    return tx;
}

// public fun raise_dispute(task: &mut Task, reason: vector<u8>, ctx: &mut TxContext)
function raiseDispute(taskId: string, reason: string) {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_TASK}::raise_dispute`,
        arguments: [
            tx.object(taskId),
            tx.pure.string(reason),
        ],
    });
    return tx;
}

// public fun cancel_task(task: &mut Task, ctx: &mut TxContext) 
function cancelTask(taskId: string) {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_TASK}::cancel_task`,
        arguments: [
            tx.object(taskId),
        ],
    });
    return tx;
}

export {
    createNewProfile,
    registerClient,
    registerFreelancer,
    createFixedPriceTask,
    createHourlyTask,
    submitProposal,
    assignTask,
    startTask,
    submitWork,
    completeTask,
    raiseDispute,
    cancelTask,
}

export {
    PLATFORM_ID,
    PACKAGE_ID as TaskPakageId,
    MODULE_TASK as TaskModule,
    UserProfile_TYPE as UserProfileType,
}
