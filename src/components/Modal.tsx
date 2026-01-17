import { useAtom } from 'jotai';
import { editModalAtom } from './ui';
import { motion } from 'framer-motion'; // Để animation đẹp (cài framer-motion nếu chưa có)
import Editor from '../editor/editor';
import { useProjects } from '@/contexts/project-context';

const EditModal = () => {
    const [{ isOpen, pageNumber }] = useAtom(editModalAtom);
    const { projects } = useProjects();

    if (!isOpen) return null;
    const pageOpen = pageNumber === 0 ? undefined : projects[pageNumber % projects.length];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md"
        >
            <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl  w-full mx-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()} // Ngăn đóng modal khi click bên trong
            >
                <Editor p={pageOpen} />
            </motion.div>
        </motion.div>
    );
};
export default EditModal;