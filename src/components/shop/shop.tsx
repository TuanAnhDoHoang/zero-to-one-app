import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useProjects } from '@/contexts/project-context';
import './shop_style.css';
import { useCurrentAccount, useSignAndExecuteTransaction, useSignPersonalMessage, useSuiClient } from "@mysten/dapp-kit";
import type { Project } from "@/models/project";
import { toast } from "@/hooks/use-toast";
import { create_idea, delist_burn, list_idea, purchase, sealApproveTx, update_quilt_id } from '../../blockchain/kioskHandlers';
import { KioskClient, Network } from '@mysten/kiosk';
import { useMarket } from "@/contexts/market-context";
import { SealClient, SessionKey } from '@mysten/seal';
import { toHex } from '@mysten/sui/utils';
import { Transaction } from "@mysten/sui/transactions";
import TaskCard, { type Task } from "./task";
import { ActivitySquare } from "lucide-react";
import { createFixedPriceTask, createHourlyTask, createNewProfile, PLATFORM_ID, registerClient, registerFreelancer, TaskModule, TaskPakageId, UserProfileType, type UserProfile } from "@/blockchain/taskHandler";
import SubmitTaskModal from "./SubmitTaskModal";

// import { EncryptedObject, SealClient, SessionKey } from '@mysten/seal';
// import { Transaction } from "@mysten/sui/transactions";
// Container animation
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

// Item animation
const item = {
  hidden: { y: 60, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 100,
    },
  },
};


export interface ListedIdea {
  id: string,
  title: string;
  description: string,
  price: string,
  category: string,
  creator: string,
  image: string,
  downloads: number,
  kioskId: string,
};

type ShopMode = 'explore' | 'submit' | 'mine' | 'task' | 'submit-task';
type Category = 'all' | 'tech' | 'social' | 'finance' | 'gaming';


const Shop: React.FC = () => {
  const [mode, setMode] = useState<ShopMode>('explore');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>('all');
  const [visibleCount, setVisibleCount] = useState(100);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSubmitTaskModal, setShowSubmitTaskModal] = useState(false);
  const { projects } = useProjects();
  const { ideas } = useMarket();
  const [visibleIdeas, setVisibleIdeas] = useState<ListedIdea[]>(ideas);
  const [hasMore, setHasmore] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const currAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  //Get user profile
  useEffect(() => {
    const getProfile = async () => {
      try {
        if (currAccount) {
          const profile = await suiClient.getOwnedObjects({
            owner: currAccount.address,
            filter: {
              StructType: `${TaskPakageId}::${TaskModule}::${UserProfileType}`
            },
            options: {
              showContent: true
            },
          });
          if (profile) {
            const content = profile.data[0].data?.content;
            if (content?.dataType === 'moveObject') {
              const fields = content.fields as any;
              const newProfile: UserProfile = {
                id: fields.id.id,
                name: fields.name,
                bio: fields.bio,
                owner: fields.owner,
                clientInfo: fields.client_info,
                freelancerInfo: fields.freelancer_info,
                createdAt: fields.created_at,
              }
              setUserProfile(newProfile);
            }
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
    getProfile();
  }, [])

  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await suiClient.getObject({
          id: PLATFORM_ID,
          options: {
            showContent: true
          }
        });

        if (response && response.data?.content?.dataType === 'moveObject') {
          const fields = response.data.content.fields as any;
          const taskIds = fields.task_ids as string[];

          if (taskIds.length === 0) {
            setTasks([]);
            return;
          }

          // Fetch all tasks in parallel
          const taskObjects = await Promise.all(
            taskIds.map(id => suiClient.getObject({
              id,
              options: { showContent: true }
            }))
          );

          const fetchedTasks: Task[] = taskObjects
            .map(obj => {
              if (obj.data?.content?.dataType === 'moveObject') {
                const fields = obj.data.content.fields as any;
                return transformMoveTaskToUiTask(fields, obj.data.objectId);
              }
              return null;
            })
            .filter((t): t is Task => t !== null);

          setTasks(fetchedTasks);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast({
          title: "Error",
          description: "Failed to load tasks from blockchain",
          variant: "destructive"
        });
      }
    };

    fetchTasks();
  }, [suiClient]);

  const transformMoveTaskToUiTask = (fields: any, id: string): Task => {
    // Helper to parse Option<T>
    const getOptionValue = (opt: any) => {
      return opt && opt.fields ? opt.fields.contents : undefined;
    };

    // Helper to format currency
    const formatSui = (mist: string) => {
      const val = Number(mist) / 1_000_000_000;
      return `${val} SUI`;
    };

    const postedTime = new Date(Number(fields.posted_time));
    const now = new Date();
    const diffHrs = Math.floor((now.getTime() - postedTime.getTime()) / (1000 * 60 * 60));
    const timeString = diffHrs > 24
      ? `Posted ${Math.floor(diffHrs / 24)} days ago`
      : `Posted ${diffHrs} hours ago`;

    const clientInfo = fields.client_info?.fields || {};
    return {
      id: id,
      title: fields.title || "Untitled Task",
      description: fields.description || "",
      client: fields.client,
      status: fields.status,
      assigned_freelancer: fields.assigned_freelancer,
      hourlyRate: fields.hourly_rate ? formatSui(fields.hourly_rate) + "/hr" : undefined, // Check how Option is represented if not stripped by SDK? 
      // Actually SDK usually deserializes Options. Let's assume standard move representation or simplified. 
      // If option is { type, fields: { vec: [] } } or similar.
      // Adjusting based on standard Sui TS SDK response for moveStruct. 
      // Usually keys are present if value exists or null/undefined.
      // Wait, in previous view_file, fields were shown.
      // Let's implement safe option extraction.
      fixedPrice: fields.fixed_price ? formatSui(fields.fixed_price) : undefined,
      duration: fields.duration || "Unknown duration",
      experienceLevel: fields.experience_level || "Intermediate",
      skills: Array.isArray(fields.skills) ? fields.skills : [],
      tools: Array.isArray(fields.tools) ? fields.tools : [],
      postedTime: timeString,
      proposals: fields.proposals, // proposals is a vector
      paymentVerified: fields.payment_verified,
      location: fields.location || "Remote",
      projectType: fields.project_type || "Project",
      deadline: fields.deadline,
      escrowBalance: fields.escrow_balance,
      clientInfo: {
        jobsPosted: Number(clientInfo.jobs_posted || 0),
        hireRate: `${clientInfo.hire_rate || 0}%`,
        openJobs: Number(clientInfo.open_jobs || 0),
        memberSince: new Date(Number(clientInfo.member_since || 0)).toLocaleDateString()
      }
    };
  };

  useEffect(() => {
    if (ideas) {
      let temp: ListedIdea[] = [];
      if (mode === 'explore') {
        if (selectedCategory === 'all') temp = ideas;
        else {
          temp = ideas.filter(idea => idea.category === selectedCategory);
        }
      }
      else if (mode === 'mine') {
        if (currAccount) {
          setSelectedCategory(null);
          temp = ideas.filter(idea => currAccount.address === idea.creator);
        }
        else temp = ideas
      }
      else {
        temp = ideas
      }
      setVisibleIdeas(temp.slice(0, visibleCount));
      setHasmore(visibleCount < temp.length);
    }
  }, [ideas, selectedCategory, mode, currAccount, visibleCount])

  const handleShowMore = () => {
    setVisibleCount(prev => prev + 10);
    setHasmore(visibleCount < visibleIdeas.length);
  };

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleModeClick = (mode: ShopMode) => {
    setMode(mode);
    if (mode === 'explore') setSelectedCategory('all');
  }

  const handleCreateNewProfile = async (name: string, bio: string) => {
    if (!currAccount) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet',
        variant: 'destructive',
      });
      return;
    }

    const tx = createNewProfile(name, bio);

    signAndExecuteTransaction(
      { transaction: tx },
      {
        onSuccess: async (result) => {
          console.log('Profile created successfully:', result);
          toast({
            title: 'Success',
            description: 'Profile created successfully!',
          });
          setShowProfileModal(false);
          // Refresh profile data
          // setTimeout(() => {
          //   window.location.reload();
          // }, 1000);
        },
        onError: (error) => {
          console.error('Transaction failed:', error);
          toast({
            title: 'Error',
            description: 'Failed to create profile',
            variant: 'destructive',
          });
        },
      }
    );
  }
  return (
    <main className="font-['Press_Start_2P'] font-cursive text-white bg-gradient-to-right from-[#0f0c29] via-[#302b63] to-[#24243e] container mx-auto px-4 py-8 font-gamer pt-30">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-16"
      >
        <div className="relative overflow-hidden rounded-3xl border-4 border-yellow-400 bg-gradient-to-r from-purple-900 to-blue-900 p-8 md:p-12 text-white">
          <div className="absolute inset-0 bg-black opacity-20" />
          <div className="relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="mb-4 text-4xl font-bold text-yellow-300 text-stroke md:text-5xl"
            >
              LEVEL UP YOUR IDEAS
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mb-8 text-xl font-medium text-white"
            >
              Publish, discover, and remix ideas in our Web3 Gameverse
            </motion.p>
            <motion.div
              // key={mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-wrap gap-4"
            >
              <button
                onClick={() => handleModeClick('explore')}
                className={`rounded-full px-6 py-3 font-bold shadow-lg transition duration-300 ${mode === 'explore'
                  ? 'bg-yellow-400 text-black'
                  : 'border-4 border-yellow-400 hover:bg-yellow-400 hover:text-black'
                  }`}
              >
                EXPLORE IDEAS
              </button>
              <button
                onClick={() => {
                  handleModeClick('submit');
                  setShowSubmitModal(true);
                }}
                className={`rounded-full px-6 py-3 font-bold transition duration-300 ${mode === 'submit'
                  ? 'bg-yellow-400 text-black'
                  : 'border-4 border-yellow-400 hover:bg-yellow-400 hover:text-black'
                  }`}
              >
                SUBMIT IDEA
              </button>
              <button
                onClick={() => handleModeClick('mine')}
                className={`rounded-full px-6 py-3 font-bold transition duration-300 ${mode === 'mine'
                  ? 'bg-yellow-400 text-black'
                  : 'border-4 border-yellow-400 hover:bg-yellow-400 hover:text-black'
                  }`}
              >
                MY IDEAS
              </button>
              <button
                onClick={() => handleModeClick('task')}
                className={`rounded-full px-6 py-3 font-bold transition duration-300 ${mode === 'task'
                  ? 'bg-yellow-400 text-black'
                  : 'border-4 border-yellow-400 hover:bg-yellow-400 hover:text-black'
                  }`}
              >
                TASKS
              </button>
              <button
                onClick={() => setShowSubmitTaskModal(true)}
                className="rounded-full px-6 py-3 font-bold transition duration-300 border-4 border-yellow-400 hover:bg-yellow-400 hover:text-black"
              >
                SUBMIT TASK
              </button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Explore/Mine Mode */}
      {(mode === 'explore' || mode === 'mine') && (
        <motion.section
          key={selectedCategory}
          id="ideas"
          // initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={container}
          className="mb-16"
        >
          <motion.div
            variants={item}
            className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center"
          >
            <h2 className="text-3xl font-bold text-white text-stroke-black">
              {mode === 'explore' ? 'FEATURED IDEAS' : 'MY SUBMITTED IDEAS'}
            </h2>
            {mode === 'explore' && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCategoryClick('all')}
                  className={`rounded-full px-4 py-2 font-bold transition ${selectedCategory === 'all'
                    ? 'bg-yellow-400 text-black'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => handleCategoryClick('tech')}
                  className={`rounded-full px-4 py-2 font-bold transition ${selectedCategory === 'tech'
                    ? 'bg-yellow-400 text-black'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                >
                  TECH
                </button>
                <button
                  onClick={() => handleCategoryClick('social')}
                  className={`rounded-full px-4 py-2 font-bold transition ${selectedCategory === 'social'
                    ? 'bg-yellow-400 text-black'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                >
                  SOCIAL
                </button>
                <button
                  onClick={() => handleCategoryClick('finance')}
                  className={`rounded-full px-4 py-2 font-bold transition ${selectedCategory === 'finance'
                    ? 'bg-yellow-400 text-black'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                >
                  FINANCE
                </button>
                <button
                  onClick={() => handleCategoryClick('gaming')}
                  className={`rounded-full px-4 py-2 font-bold transition ${selectedCategory === 'gaming'
                    ? 'bg-yellow-400 text-black'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                >
                  GAMING
                </button>
              </div>
            )}
          </motion.div>

          {/* Grid Cards */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {visibleIdeas.map((idea, index) => (
              <motion.div key={index} variants={item}>
                <IdeaCard {...idea} />
              </motion.div>
            ))}
          </motion.div>

          {/* Show More Button */}
          {hasMore && mode === 'explore' && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleShowMore}
                className="rounded-full bg-yellow-400 px-8 py-3 font-bold text-black transition hover:bg-yellow-300 hover:shadow-lg"
              >
                SHOW MORE
              </button>
            </div>
          )}
        </motion.section>
      )}

      {/* Task Mode */}
      {mode === 'task' && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={container}
          className="mb-16"
        >
          <motion.div
            variants={item}
            className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center"
          >
            {userProfile ?
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex cursor-pointer items-center gap-2 rounded-full bg-green-400 px-4 py-2 text-xs font-bold text-black transition hover:bg-green-300"
              >
                <ActivitySquare />
                {userProfile.name}
              </button>
              :
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex cursor-pointer items-center gap-2 rounded-full bg-red-400 px-4 py-2 text-xs font-bold text-black transition hover:bg-red-300"
              >
                <ActivitySquare />
                CREATE PROFILE
              </button>
            }

            <h2 className="text-3xl font-bold text-white text-stroke-black">
              AVAILABLE TASKS
            </h2>
          </motion.div>

          {/* Task Cards Grid */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 "
          >
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <motion.div key={task.id} variants={item} className="">
                  <TaskCard userProfileId={userProfile?.id || ''} task={task} />
                </motion.div>
              ))
            ) : (
              /* Fallback or empty state, or maybe keep MOCK_TASKS if loading? 
                 User said "instead of", implying replacement. 
                 But if no tasks are on chain, might be empty.
                 Let's show a message if empty, or just nothing.
                 Or maybe keep MOCK if tasks is empty just for demo purposes if that was the intent?
                 "get all tasks and show to user instead of MOCK_TASKS" -> Replace logic.
              */
              <div className="text-gray-400 text-center py-10">
                {tasks.length === 0 ? "No tasks found on blockchain. (Check console)" : "Loading..."}
              </div>
            )}
          </motion.div>
        </motion.section>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <SubmitIdeaModal
          projects={projects}
          onClose={() => {
            setShowSubmitModal(false);
            setMode('explore');
          }}
        />
      )}

      {/* Create Profile Modal */}
      {showProfileModal && (
        <CreateProfileModal
          onClose={() => setShowProfileModal(false)}
          onSubmit={handleCreateNewProfile}
          userProfile={userProfile}
        />
      )}

      {/* Submit Task Modal */}
      {showSubmitTaskModal && (
        <SubmitTaskModal
          onClose={() => setShowSubmitTaskModal(false)}
        />
      )}

      {/* Upcoming Features */}
      <motion.section
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mb-16 rounded-2xl border-4 border-yellow-400 bg-gray-900 p-8"
      >
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 text-3xl font-bold text-white text-stroke-black"
        >
          UPCOMING FEATURES
        </motion.h2>
        <div className="grid gap-8 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border-2 border-yellow-400 bg-gray-800 p-6 transition-all hover:border-yellow-300"
          >
            <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold text-yellow-400">
              <span>👥</span>
              GUILD MATCHING
            </h3>
            <p className="text-gray-300">
              Find your perfect team members based on skills, interests, and reputation scores.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-xl border-2 border-yellow-400 bg-gray-800 p-6 transition-all hover:border-yellow-300"
          >
            <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold text-yellow-400">
              <span>🏆</span>
              BOUNTY BOARD
            </h3>
            <p className="text-gray-300">
              Post quests for specific features or tasks and attract top adventurers to your project.
            </p>
          </motion.div>
        </div>
      </motion.section>
    </main>
  );
};

// Submit Idea Modal Component
interface SubmitIdeaModalProps {
  projects: Project[];
  onClose: () => void;
}

const SubmitIdeaModal: React.FC<SubmitIdeaModalProps> = ({ projects, onClose }) => {
  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id || '');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<string>('tech');
  const [imageUrl, setImageUrl] = useState('');
  const [userKiosks, setUserKiosks] = useState<Array<{ kioskId: string; kioskOwnerCapId: string }>>([]);
  const [selectedKiosk, setSelectedKiosk] = useState<{ kioskId: string; kioskOwnerCapId: string } | null>(null);
  const [isLoadingKiosks, setIsLoadingKiosks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { addIdeaToKiosk } = useMarket();

  // Fetch user's kiosks
  useEffect(() => {
    const fetchUserKiosks = async () => {
      if (!currAccount?.address) return;

      setIsLoadingKiosks(true);
      try {
        const kioskClient = new KioskClient({
          client: suiClient,
          network: Network.TESTNET,
        });

        const { kioskOwnerCaps } = await kioskClient.getOwnedKiosks({ address: currAccount.address });

        const kiosks = kioskOwnerCaps.map((cap) => ({
          kioskId: cap.kioskId,
          kioskOwnerCapId: cap.objectId,
        }));

        setUserKiosks(kiosks);
        if (kiosks.length > 0) {
          setSelectedKiosk(kiosks[0]);
        }
      } catch (error) {
        console.error('Error fetching kiosks:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch your kiosks',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingKiosks(false);
      }
    };

    fetchUserKiosks();
  }, [currAccount?.address, suiClient]);

  const handleProjectToggle = (projectId: string) => {
    const pid = projects.find(p => p.id === projectId);
    if (pid) setSelectedProject(pid.id);
  };

  const handleKioskSelect = (kioskId: string, kioskOwnerCapId: string) => {
    setSelectedKiosk({ kioskId, kioskOwnerCapId });
  };

  const createIdea = async (
    name: string,
    description: string,
    category: string,
    address: string,
    imageUrl: string,
    price: number,
  ) => {
    const finalImageUrl = imageUrl.trim() || '/public/logo.jpg';
    const tx = create_idea({
      title: name,
      description: description,
      category: category,
      creator: address,
      downloads: 0,
      image: finalImageUrl,
      price: price.toString(),
    });

    let digest = '';
    await new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            digest = result.digest;
            resolve(result);
          },
          onError: (error) => {
            console.error('Transaction failed:', error);
            reject(error);
          },
        }
      );
    });
    return digest;
  }

  const updateQuiltId = async (ideaId: string, quiltId: string) => {
    const tx = update_quilt_id(
      ideaId,
      quiltId
    );
    let digest = '';
    await new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            digest = result.digest;
            resolve(result);
          },
          onError: (error) => {
            console.error('Transaction failed:', error);
            reject(error);
          },
        }
      );
    });
    return digest;
  }

  const listIdea = async (ideaId: string, kioskId: string, kioskOwnerCapId: string) => {
    const tx = list_idea({
      ideaId,
      kioskId,
      kioskOwnerCapId,
    });
    let digest = '';
    await new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            digest = result.digest;
            resolve(result);
          },
          onError: (error) => {
            console.error('Transaction failed:', error);
            reject(error);
          },
        }
      );
    });
    return digest;
  }

  const getIdeaId = async (digest: string) => {
    const { objectChanges } = await suiClient.waitForTransaction({
      digest, options: {
        showObjectChanges: true
      }
    });
    if (objectChanges) {
      const pid = import.meta.env.VITE_PID;
      const module = import.meta.env.VITE_MODULE_IDEA;
      const IdeaType = 'Idea';
      const ideaId = objectChanges.map(obj => {
        if (obj.type === 'created' && obj.objectType === `${pid}::${module}::${IdeaType}`) {
          return obj.objectId;
        }
      }).filter(id => id !== undefined)[0] as string;
      return ideaId;
    }
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      // Validation
      if (!selectedProject) {
        toast({
          title: 'Error',
          description: 'Please choose your project to publish',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      if (!currAccount) {
        toast({
          title: 'Error',
          description: 'Please connect your wallet',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      if (!category) {
        toast({
          title: 'Error',
          description: 'Please choose category',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      if (!price) {
        toast({
          title: 'Error',
          description: 'Please enter a price',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      if (!selectedKiosk) {
        toast({
          title: 'Error',
          description: 'Please select a kiosk. You need at least one kiosk to publish an idea.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const sp = projects.find(p => p.id === selectedProject);
      if (!sp) return;

      //create Idea
      const createIdeaDigest = await createIdea(
        sp.name,
        description,
        category,
        currAccount.address,
        imageUrl,
        Number(price),
      );
      //get ideaId after transaction
      const ideaId = await getIdeaId(createIdeaDigest);
      if (!ideaId) {
        console.log('Failed to get idea ID');
        return;
      }

      //encrypt end deploy walrus by server
      const response = await fetch(`${import.meta.env.VITE_ENDPOINT}/market/upload-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project: sp,
          ideaId,
          address: currAccount.address,
        }),
      });
      if (!response.ok) {
        alert('Failed to upload project');
        return;
      }

      const data = await response.json();
      console.log('data upload project: ', data);

      const quiltId = data.result as string;
      console.log('quiltId upload project: ', quiltId);

      //update quilt id for idea in blockchain
      await updateQuiltId(ideaId, quiltId);

      //list to kiosk
      await listIdea(ideaId, selectedKiosk.kioskId, selectedKiosk.kioskOwnerCapId);

      //update to database
      await submitSuccess(createIdeaDigest);
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error submitting idea:', error);
      setIsSubmitting(false);
    }
  };

  const submitSuccess = async (digest: string) => {
    try {
      console.log('Transaction successful');
      const { objectChanges } = await suiClient.waitForTransaction({
        digest,
        options: {
          showObjectChanges: true,
        }
      })
      console.log('objectChanges: ', objectChanges);
      if (objectChanges) {
        const pid = import.meta.env.VITE_PID;
        const module = import.meta.env.VITE_MODULE_IDEA;
        const typeName = 'Idea';
        const newIdea = objectChanges.find(obj => obj.type === 'created' && obj.objectType === `${pid}::${module}::${typeName}`)
        if (selectedKiosk && newIdea && newIdea.type === 'created') {
          console.log('newIdea: ', newIdea);
          await addIdeaToKiosk(selectedKiosk.kioskId, newIdea.objectId)
        };
      }
      onClose();
    }
    catch (e) {
      throw (e)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl border-2 border-yellow-400 bg-gray-900 p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="mb-6 text-3xl font-bold uppercase text-yellow-400">Submit New Idea</h2>

        {/* Project Selection */}
        <div className="mb-6">
          <label className="mb-3 block text-lg font-bold text-white">
            Select Projects (Multiple)
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 max-h-60 overflow-y-auto border border-gray-700 rounded-lg p-4">
            {projects.length === 0 ? (
              <p className="text-gray-400 col-span-2">No projects available. Create a project first!</p>
            ) : (
              projects.map((project) => (
                <label
                  key={project.id}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition ${selectedProject === project.id
                    ? 'border-yellow-400 bg-yellow-900/20'
                    : 'border-gray-700 hover:border-gray-600'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={project.id === selectedProject}
                    onChange={() => handleProjectToggle(project.id)}
                    className="mr-3"
                  />
                  <span className="font-bold text-white">{project.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Image URL */}
        <div className="mb-6">
          <label className="mb-3 block text-lg font-bold text-white">
            Image URL (Optional)
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg (or leave blank for default logo)"
            className="w-full rounded-lg border-2 border-gray-700 bg-gray-800 p-4 text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none"
          />
          <p className="mt-2 text-xs text-gray-400">Default: /public/logo.jpg</p>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="mb-3 block text-lg font-bold text-white">
            Idea Description (For Marketing)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write a compelling description for potential buyers..."
            className="w-full rounded-lg border-2 border-gray-700 bg-gray-800 p-4 text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none"
            rows={5}
          />
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="mb-3 block text-lg font-bold text-white">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-700 bg-gray-800 p-4 text-white focus:border-yellow-400 focus:outline-none"
          >
            <option value="tech">TECH</option>
            <option value="social">SOCIAL</option>
            <option value="finance">FINANCE</option>
            <option value="gaming">GAMING</option>
          </select>
        </div>

        {/* Price */}
        <div className="mb-6">
          <label className="mb-3 block text-lg font-bold text-white">Price (SUI)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="25"
            className="w-full rounded-lg border-2 border-gray-700 bg-gray-800 p-4 text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none"
          />
        </div>

        {/* Kiosk Selection */}
        <div className="mb-6">
          <label className="mb-3 block text-lg font-bold text-white">
            Select Kiosk (Required)
          </label>
          {isLoadingKiosks ? (
            <div className="rounded-lg border-2 border-gray-700 bg-gray-800 p-4 text-center text-gray-400">
              Loading your kiosks...
            </div>
          ) : userKiosks.length === 0 ? (
            <div className="rounded-lg border-2 border-red-700 bg-red-900/20 p-4">
              <p className="text-red-400 font-bold mb-2">No kiosks found!</p>
              <p className="text-sm text-gray-300">You need at least one kiosk to publish an idea. Please create a kiosk first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-h-40 overflow-y-auto border border-gray-700 rounded-lg p-4">
              {userKiosks.map((kiosk, index) => (
                <label
                  key={kiosk.kioskId}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition ${selectedKiosk?.kioskId === kiosk.kioskId
                    ? 'border-yellow-400 bg-yellow-900/20'
                    : 'border-gray-700 hover:border-gray-600'
                    }`}
                >
                  <input
                    type="radio"
                    name="kiosk"
                    checked={selectedKiosk?.kioskId === kiosk.kioskId}
                    onChange={() => handleKioskSelect(kiosk.kioskId, kiosk.kioskOwnerCapId)}
                    className="mr-3"
                  />
                  <span className="font-bold text-white">Kiosk #{index + 1}</span>
                  <div className="mt-2 text-xs text-gray-400 break-all">
                    <div>ID: {kiosk.kioskId.substring(0, 20)}...</div>
                    <div>Cap: {kiosk.kioskOwnerCapId.substring(0, 20)}...</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-gray-700 px-6 py-3 font-bold text-white transition hover:bg-gray-600"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedProject || !price || !selectedKiosk || isLoadingKiosks || !currAccount}
            className="hover:cursor-pointer flex-1 rounded-lg bg-yellow-400 px-6 py-3 font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'SUBMIT IDEA'}
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

// Create Profile Modal Component
interface CreateProfileModalProps {
  onClose: () => void;
  onSubmit: (name: string, bio: string) => void;
  userProfile?: UserProfile | null;
}

const CreateProfileModal: React.FC<CreateProfileModalProps> = ({ onClose, onSubmit, userProfile }) => {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your name',
        variant: 'destructive',
      });
      return;
    }

    if (!bio.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your bio',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name, bio);
    } catch (error) {
      console.error('Error creating profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterClient = async () => {
    if (!currAccount) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet',
        variant: 'destructive',
      });
      return;
    }
    if (!userProfile) return;
    const tx = await registerClient(userProfile.id);
    signAndExecuteTransaction({ transaction: tx }, {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Client registered successfully',
        });
        onClose();
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: 'Failed to register client',
          variant: 'destructive',
        });
      },
    });
  }

  const handleRegisterFreelancer = async () => {
    if (!userProfile) return;
    const tx = await registerFreelancer(userProfile.id);
    signAndExecuteTransaction({ transaction: tx }, {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Freelancer registered successfully',
        });
        onClose();
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: 'Failed to register freelancer',
          variant: 'destructive',
        });
      },
    });
  }

  // If userProfile exists, show profile details
  if (userProfile) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl rounded-2xl border-2 border-yellow-400 bg-gray-900 p-8 shadow-2xl"
        >
          <h2 className="mb-6 text-3xl font-bold uppercase text-yellow-400">User Profile</h2>

          <div className="space-y-6">
            {/* Name */}
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
              <label className="mb-2 block text-sm font-bold text-gray-400">NAME</label>
              <p className="text-lg text-white">{userProfile.name}</p>
            </div>

            {/* Bio */}
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
              <label className="mb-2 block text-sm font-bold text-gray-400">BIO</label>
              <p className="text-white leading-relaxed">{userProfile.bio}</p>
            </div>

            {/* Owner */}
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
              <label className="mb-2 block text-sm font-bold text-gray-400">OWNER ADDRESS</label>
              <p className="text-white font-mono text-sm break-all">{userProfile.owner}</p>
            </div>

            {/* Client Info - only show if not null */}
            {userProfile.clientInfo ? (
              <div className="rounded-lg border border-green-700 bg-green-900/20 p-4">
                <label className="mb-3 block text-lg font-bold text-green-400">CLIENT INFO</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Jobs Posted</p>
                    <p className="text-white font-bold">{userProfile.clientInfo.jobsPosted}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Hire Rate</p>
                    <p className="text-white font-bold">{userProfile.clientInfo.hireRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Open Jobs</p>
                    <p className="text-white font-bold">{userProfile.clientInfo.openJobs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total Spent</p>
                    <p className="text-white font-bold">{userProfile.clientInfo.totalSpent} SUI</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Member Since</p>
                    <p className="text-white font-bold">{new Date(userProfile.clientInfo.memberSince).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-green-700 bg-green-900/20 p-4">
                <label className="mb-3 block text-lg font-bold text-green-400">CLIENT INFO</label>
                <button
                  onClick={handleRegisterClient}
                  className="rounded-lg bg-yellow-400 px-8 py-3 font-bold text-black transition hover:bg-yellow-300">Create Client Profile</button>
              </div>
            )}

            {/* Freelancer Info - only show if not null */}
            {userProfile.freelancerInfo ? (
              <div className="rounded-lg border border-blue-700 bg-blue-900/20 p-4">
                <label className="mb-3 block text-lg font-bold text-blue-400">FREELANCER INFO</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Jobs Completed</p>
                    <p className="text-white font-bold">{userProfile.freelancerInfo.jobsCompleted}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Success Rate</p>
                    <p className="text-white font-bold">{userProfile.freelancerInfo.successRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total Earned</p>
                    <p className="text-white font-bold">{userProfile.freelancerInfo.totalEarned} SUI</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Member Since</p>
                    <p className="text-white font-bold">{new Date(userProfile.freelancerInfo.memberSince).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-blue-700 bg-blue-900/20 p-4">
                <label className="mb-3 block text-lg font-bold text-blue-400">FREELANCER INFO</label>
                <button
                  onClick={handleRegisterFreelancer}
                  className="rounded-lg bg-yellow-400 px-8 py-3 font-bold text-black transition hover:bg-yellow-300">Create Freelancer Profile</button>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg bg-yellow-400 px-8 py-3 font-bold text-black transition hover:bg-yellow-300"
            >
              CLOSE
            </button>
          </div>

          {/* Close X button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-2xl text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </motion.div>
      </motion.div>
    );
  }

  // If no userProfile, show create profile form
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border-2 border-yellow-400 bg-gray-900 p-8 shadow-2xl"
      >
        <h2 className="mb-6 text-3xl font-bold uppercase text-yellow-400">Create Your Profile</h2>

        {/* Name Input */}
        <div className="mb-6">
          <label className="mb-3 block text-lg font-bold text-white">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-lg border-2 border-gray-700 bg-gray-800 p-4 text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none"
            maxLength={50}
          />
          <p className="mt-2 text-xs text-gray-400">Maximum 50 characters</p>
        </div>

        {/* Bio Input */}
        <div className="mb-6">
          <label className="mb-3 block text-lg font-bold text-white">
            Bio <span className="text-red-400">*</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            className="w-full rounded-lg border-2 border-gray-700 bg-gray-800 p-4 text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none"
            rows={5}
            maxLength={500}
          />
          <p className="mt-2 text-xs text-gray-400">Maximum 500 characters</p>
        </div>

        {/* Info Box */}
        <div className="mb-6 rounded-lg border border-blue-400 bg-blue-900/20 p-4">
          <p className="text-sm text-blue-300">
            <strong>ℹ️ Note:</strong> Creating a profile will require a blockchain transaction.
            Make sure your wallet is connected and has sufficient funds for gas fees.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-gray-700 px-6 py-3 font-bold text-white transition hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !bio.trim()}
            className="flex-1 rounded-lg bg-yellow-400 px-6 py-3 font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'CREATING...' : 'CREATE PROFILE'}
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 text-2xl text-gray-400 hover:text-white disabled:opacity-50"
        >
          ✕
        </button>
      </motion.div>
    </motion.div>
  );
};

// IdeaCard Component
interface IdeaCardProps {
  id: string,
  image: string;
  title: string;
  description: string;
  price: string;
  category: string;
  creator: string;
  downloads?: number;
  kioskId: string,
}

const IdeaCard: React.FC<IdeaCardProps> = ({
  id: objectId,
  image,
  title,
  description,
  price,
  category,
  creator,
  downloads = 0,
  kioskId
}) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showForkModal, setShowForkModal] = useState(false);
  const currAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  const { createProject } = useProjects();

  const purchaseIdea = async () => {
    try {
      if (!currAccount) {
        alert('Please connect your wallet');
        return;
      }

      const tx = purchase({ price: Number(price), ideaId: objectId, kioskId: kioskId });
      let digest = '';
      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: tx },
          {
            onSuccess: async (result) => {
              digest = result.digest;
              resolve(digest);
            },
            onError: (err) => {
              console.error('Transaction failed:', err);
              reject(err);
            },
          }
        );
      });
      return digest;
    } catch (error) {
      console.error('Error in handlePurchase:', error);
    }
  }

  const getApproveIdeaId = async (digest: string) => {
    const { objectChanges } = await suiClient.waitForTransaction({
      digest,
      options: {
        showObjectChanges: true,
      }
    });
    const pid = import.meta.env.VITE_PID;
    const module = import.meta.env.VITE_MODULE_SEAL_POLICY;
    const objType = 'PurchaseApproval';
    if (objectChanges) {
      const approveIdeaId = objectChanges.map(obj => {
        if (obj.type === 'created' && obj.objectType === `${pid}::${module}::${objType}`) return obj.objectId;
      }).filter(id => id !== undefined)[0];
      return approveIdeaId as string;
    }
  }

  const getSealIdFromApproval = async (approvalId: string) => {
    const response = await suiClient.getObject({
      id: approvalId,
      options: {
        showContent: true,
      }
    });
    const sealId = (response?.data?.content as any).fields?.seal_id as Uint8Array;
    return sealId;
  }

  const getQuiltIdFromApproval = async (approvalId: string) => {
    const response = await suiClient.getObject({
      id: approvalId,
      options: {
        showContent: true,
      }
    });
    const quiltId = (response?.data?.content as any).fields?.quilt_id as string;
    return quiltId;
  }

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

  const getProjectFromWalrus = async (quiltPatchId: string) => {
    try {
      const data = await getDataFromWalrus(quiltPatchId);
      console.log('data from walrus: ', data);
      return data;
    } catch (error) {
      console.error("Error getting project from Walrus:", error);
      throw error;
    }
  };

  const getDataFromWalrus = async (quiltId: string) => {
    const aggregator = "https://aggregator.walrus-testnet.walrus.space";
    // curl "$AGGREGATOR/v1/blobs/by-quilt-patch-id/6XUOE-Q5-nAXHRifN6n9nomVDtHZQbGuAkW3PjlBuKoBAQDQAA"
    const response = await fetch(`${aggregator}/v1/blobs/by-quilt-patch-id/${quiltId}`, {
      method: 'GET',
    })
    const data = await response.bytes();
    // const bytes = new Uint8Array(data); // Convert ArrayBuffer to Uint8Array

    return data;
  }

  const sealApprove = async (sealId: Uint8Array, approvalPurchaseId: string) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${import.meta.env.VITE_PID}::${import.meta.env.VITE_MODULE_SEAL_POLICY}::seal_approve`,
      arguments: [
        tx.pure.vector('u8', sealId),
        tx.object(approvalPurchaseId)
      ]
    });
    await new Promise((resolve, reject) => {
      signAndExecuteTransaction({
        transaction: tx,
      }, {
        onSuccess: (result) => {
          console.log('Seal approval successful:', result);
          resolve(result);
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  }

  const decryptProject = async (
    sealId: Uint8Array,
    encryptedBytes: Uint8Array,
    txBytes: Uint8Array,
    sessionKey: SessionKey
  ) => {
    try {
      const serverObjectIds = ["0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75", "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8"];
      const sealClient = new SealClient({
        suiClient,
        serverConfigs: serverObjectIds.map((id) => ({
          objectId: id,
          weight: 1,
        })),
        verifyKeyServers: false,
      });

      await sealClient.fetchKeys({
        ids: [toHex(sealId)],
        txBytes,
        sessionKey,
        threshold: 1,
      });
      // Decrypt the data
      const decryptedData = await sealClient.decrypt({
        data: encryptedBytes,
        txBytes,
        sessionKey,
      });

      // Convert decrypted bytes back to text
      const decryptedText = new TextDecoder().decode(decryptedData);
      console.log('Decryption successful');

      // Parse the text back to ProjectType
      return decryptedText;
    } catch (error) {
      console.error('Error in decryptProject:', error);
      throw new Error(
        `Failed to decrypt project: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  //fork transaction digest
  const getProject = async (digest: string) => {
    try {
      if (!currAccount) {
        alert('Please connect your wallet');
        return;
      }
      //get approve idea
      const approvalPurchaseId = await getApproveIdeaId(digest);
      if (!approvalPurchaseId) {
        console.error('Failed to get approval idea ID');
        return;
      }
      //get sealID
      const sealId = await getSealIdFromApproval(approvalPurchaseId);
      if (!sealId) {
        console.error('Failed to get seal ID');
        return;
      }
      const quiltPatchId = await getQuiltIdFromApproval(approvalPurchaseId);
      if (!quiltPatchId) {
        console.error('Failed to get quilt ID');
        return;
      }

      const sessionKey = await getSessionKey();
      if (!sessionKey) {
        console.error('Failed to get session key');
        return;
      }

      await sealApprove(sealId, approvalPurchaseId);
      const txBytes = await sealApproveTx({ approvalPurchaseId, sealId, sender: currAccount.address });
      const data = await getProjectFromWalrus(quiltPatchId);
      const decryptedProject = await decryptProject(sealId, data, txBytes, sessionKey);
      // console.log("Decrypted project:", decryptedProject);
      const projectParsed = JSON.parse(decryptedProject) as Project;
      if (!projectParsed) {
        console.error("Wrong project format", decryptedProject);
        return;
      }
      await createProject({
        ...projectParsed
      });

      // console.log('New Project created: ', newProject);

      // const response = await fetch(`${import.meta.env.VITE_ENDPOINT}/market/get-project`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     quiltPatchId,
      //     sessionKey,
      //     txBytes
      //   }),
      // });
      // console.log('Project fetched successfully:', response);
    } catch (error) {
      console.error('Error fetching project:', error);
    }

  }

  const handleFork = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const purchaseDigest = await purchaseIdea();
      if (!purchaseDigest) {
        console.error('Failed to purchase idea');
        return;
      }
      await getProject(purchaseDigest);
      setShowForkModal(true);
    } catch (error) {
      console.error('Error in handlePurchase:', error);

    }
  };

  const handleDelete = async () => {
    try {
      if (!currAccount) return;

      const kioskClient = new KioskClient({
        client: suiClient,
        network: Network.TESTNET,
      });

      const { kioskOwnerCaps } = await kioskClient.getOwnedKiosks({ address: currAccount.address });

      // 1. Properly find the kiosk containing the object
      let targetKiosk = null;

      for (const cap of kioskOwnerCaps) {
        const res = await kioskClient.getKiosk({
          id: cap.kioskId,
        });
        if (res.itemIds.includes(objectId)) {
          targetKiosk = {
            kioskId: cap.kioskId,
            kioskOwnerCapId: cap.objectId
          };
          break;
        }
      }
      console.log('target kiosk: ', targetKiosk);
      if (!targetKiosk) {
        console.error("Could not find which kiosk owns this idea.")
        return;
      }

      // // 2. Ensure objectId is a valid string before calling tx
      // if (typeof objectId !== 'string' || !objectId.startsWith('0x')) {
      //   console.error("Invalid objectId:", objectId);
      //   return;
      // }

      const tx = delist_burn({
        ideaId: objectId,
        kioskId: targetKiosk.kioskId,
        kioskOwnerCapId: targetKiosk.kioskOwnerCapId
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log({ title: "Success", description: "Idea delisted and burned." });
            // Note: Trigger a refresh of your market context here
          },
          onError: (err) => {
            console.error('Transaction failed:', err);
          },
        }
      );

    } catch (error) {
      console.error('Error in handleDelete:', error);
    }
  };

  const closeForkModal = () => {
    setShowForkModal(false);
  };

  return (
    <>
      {/* <div>
        <button onClick={() => getProject('85hrb9TCPtbSy37EQ4NrkwBti33kPswvNW8j6uFjoUVA')}>get Project test</button>
      </div> */}
      <div
        onClick={() => setShowDetailsModal(true)}
        className="cursor-pointer overflow-hidden rounded-xl border-2 border-gray-700 bg-gray-900 shadow-lg transition-all hover:border-yellow-400 hover:shadow-yellow-400/30 hover:scale-105 h-full flex flex-col"
      >
        {/* Image container */}
        <div className="relative h-48 w-full overflow-hidden bg-gray-800 flex-shrink-0">
          <img src={image} alt={title} className="h-full w-full object-cover transition-transform hover:scale-110" />
          {/* Category badge */}
          <span className="absolute right-3 top-3 rounded-full bg-red-500 px-3 py-1 text-xs font-bold uppercase text-white">
            {category}
          </span>
        </div>

        {/* Content container */}
        <div className="p-6 flex flex-col flex-1">
          <h3 className="mb-3 text-xl font-bold uppercase text-yellow-400 line-clamp-2">{title}</h3>
          <p className="mb-4 text-sm text-gray-300 leading-relaxed line-clamp-3 flex-1">{description}</p>

          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-green-400">{price}</span>
              <span className="text-xs text-gray-400">by {creator.substring(0, 8)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>📥</span>
              <span>{downloads} downloads</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="text-[10px] flex gap-3 flex-shrink-0">
            <button className="flex-1 rounded-lg bg-blue-500 px-4 py-2 font-bold text-white transition-all hover:bg-blue-600">
              VIEW TEASER
            </button>
            {currAccount && currAccount.address === creator ?
              <button
                onClick={handleDelete}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 font-bold text-black transition-all hover:bg-red-600"
              >
                DELETE
              </button>
              :
              <button
                onClick={handleFork}
                className="flex-1 rounded-lg bg-yellow-500 px-4 py-2 font-bold text-black transition-all hover:bg-yellow-600"
              >
                FORK ({price})
              </button>
            }
          </div>
        </div>
      </div>

      {/* Details Modal */}
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
            className="max-w-3xl w-full rounded-2xl border-2 border-yellow-400 bg-gray-900 p-8 shadow-2xl"
          >
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-64">
                <img
                  src={image}
                  alt={title}
                  className="h-64 w-64 rounded-xl object-cover border-2 border-gray-700"
                />
              </div>

              <div className="flex-1 flex flex-col">
                <span className="inline-block w-fit rounded-full bg-red-500 px-3 py-1 text-xs font-bold uppercase text-white mb-3">
                  {category}
                </span>
                <h2 className="mb-4 text-3xl font-bold uppercase text-yellow-400">{title}</h2>
                <p className="mb-6 text-gray-300 leading-relaxed">{description}</p>

                <div className="mb-6 space-y-2 text-gray-300">
                  <p>Creator: <span className="text-yellow-400 font-bold">{creator.substring(0, 8)}</span></p>
                  <p>Price: <span className="text-green-400 font-bold">{price}</span></p>
                </div>

                <div className="mt-auto flex gap-3">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1 rounded-lg bg-gray-700 px-4 py-3 font-bold text-white transition-all hover:bg-gray-600"
                  >
                    CLOSE
                  </button>
                  {currAccount && currAccount.address === creator ?
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDetailsModal(false);
                        handleDelete
                      }}
                      className="flex-1 rounded-lg bg-red-500 px-4 py-3 font-bold text-black transition-all hover:bg-red-600"
                    >
                      DELETE
                    </button>
                    :
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDetailsModal(false);
                        handleFork(e as any);
                      }}
                      className="flex-1 rounded-lg bg-yellow-500 px-4 py-3 font-bold text-black transition-all hover:bg-yellow-600"
                    >
                      FORK ({price})
                    </button>
                  }
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDetailsModal(false)}
              className="absolute right-4 top-4 text-2xl text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Fork Success Modal */}
      {showForkModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeForkModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border-2 border-green-400 bg-gray-900 p-8 shadow-2xl text-center"
          >
            <div className="mb-6 text-5xl">✓</div>
            <h2 className="mb-4 text-2xl font-bold uppercase text-green-400">Fork Successful!</h2>
            <p className="mb-6 text-gray-300">You have successfully forked this idea.</p>

            <div className="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-4 text-left">
              <h3 className="mb-3 font-bold text-yellow-400">TRANSACTION DETAILS</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Idea Title:</span>
                  <span className="font-bold text-white">{title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Creator:</span>
                  <span className="font-bold text-white">{creator}</span>
                </div>
                <div className="border-t border-gray-700 my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total Cost:</span>
                  <span className="text-green-400">{price}</span>
                </div>
              </div>
            </div>

            <button
              onClick={closeForkModal}
              className="w-full rounded-lg bg-green-500 px-4 py-3 font-bold text-black transition-all hover:bg-green-600"
            >
              DONE
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

export default Shop;

