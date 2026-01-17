import { useAuth } from "@/contexts/auth-context";
import { useProjects } from "@/contexts/project-context";
import { atom, useAtom } from "jotai";
import { useEffect, useMemo, useRef } from "react";

const picMap = [
    "DSC00680",
    "DSC00933",
    "DSC00966",
    "DSC00983",
    "DSC01011",
    "DSC01040",
    "DSC01064",
    "DSC01071",
    "DSC01103",
    "DSC01145",
    "DSC01420",
    "DSC01461",
    "DSC01489",
    "DSC02031",
    "DSC02064",
    "DSC02069",
];

export const pageAtom = atom(0);
export const pagesStructureAtom = atom<Array<{ front: string; back: string }> | null>(null);

// Atom mới để biết đang zoom page nào trước khi edit
export const zoomingEditPageAtom = atom<number>(-1); // -1 = không zoom
//Modal for editing
export const editModalAtom = atom<{
    isOpen: boolean;
    pageNumber: number; // trang đang edit
}>({
    isOpen: false,
    pageNumber: -1,
});
//Note mode
export const noteModeAtom = atom<boolean>(true);  //mặc định ở chế độ note 
export const UI = () => {
    const [page, setPage] = useAtom(pageAtom);
    const [zoomingEditPage] = useAtom(zoomingEditPageAtom);
    const [noteMode] = useAtom(noteModeAtom);
    const { isAuthenticated } = useAuth();
    const { projects } = useProjects();
    const [_, setPagesStruct] = useAtom(pagesStructureAtom);
    const hasInteractedRef = useRef(false);


    // Generate pages based on projects
    const pages = useMemo(() => {
        const generatedPages = [
            {
                front: "book-cover",
                back: picMap[0],
            },
        ];
        for (let i = 1; i < projects.length; i++) {
            generatedPages.push({
                front: "content",
                back: picMap[i],
            });
        }

        generatedPages.push({
            front: "content",
            back: "book-back",
        });

        return generatedPages;
    }, [projects]);
    setPagesStruct(pages);

    useEffect(() => {
        const handleFirstInteraction = () => {
            hasInteractedRef.current = true;
            document.removeEventListener("click", handleFirstInteraction);
            document.removeEventListener("touchstart", handleFirstInteraction);
            document.removeEventListener("keydown", handleFirstInteraction);
        };

        document.addEventListener("click", handleFirstInteraction);
        document.addEventListener("touchstart", handleFirstInteraction);
        document.addEventListener("keydown", handleFirstInteraction);

        return () => {
            document.removeEventListener("click", handleFirstInteraction);
            document.removeEventListener("touchstart", handleFirstInteraction);
            document.removeEventListener("keydown", handleFirstInteraction);
        };
    }, []);
    useEffect(() => {
        const playAudio = async () => {
            try {
                const audio = new Audio("/audios/page-flip-01a.mp3");
                audio.currentTime = 0; // Reset to start
                await audio.play().catch(e => console.error("Audio error:", e));
            } catch (error) {
                console.error("Audio play failed:", error);
            }
        };

        playAudio();
    }, [page]);
    return (
        <>
            <main className="pointer-events-none select-none z-10 fixed inset-0 flex justify-between flex-col">
                <div className={`transition-all duration-700 ease-out
                    ${noteMode
                        ? 'opacity-100 scale-100 translate-x-0 translate-y-0 pointer-events-auto'
                        : 'opacity-0 scale-90 -translate-x-4 translate-y-4 pointer-events-none'
                    }
                    `}>
                    <img
                        className="w-20 mt-10 ml-10 drop-shadow-2xl"
                        src="/images/wawasensei-white.png"
                        alt="Wawa Sensei Logo"
                    />
                </div>
                {zoomingEditPage === -1 && isAuthenticated && noteMode &&
                    <div className="w-full overflow-auto pointer-events-auto flex justify-center">
                        <div className="overflow-auto flex items-center gap-4 max-w-full p-10">
                            {[...pages].map((_, index) => (
                                <button
                                    key={index}
                                    className={`border-transparent hover:border-white transition-all duration-300  px-4 py-3 rounded-full  text-lg uppercase shrink-0 border ${index === page
                                        ? "bg-white/90 text-black"
                                        : "bg-black/30 text-white"
                                        }`}
                                    onClick={() => setPage(index)}
                                >
                                    {index === 0 ? "Cover" : `Page ${index}`}
                                </button>
                            ))}
                            <button
                                className={`border-transparent hover:border-white transition-all duration-300  px-4 py-3 rounded-full  text-lg uppercase shrink-0 border ${page === pages.length
                                    ? "bg-white/90 text-black"
                                    : "bg-black/30 text-white"
                                    }`}
                                onClick={() => setPage(pages.length)}
                            >
                                Back Cover
                            </button>
                        </div>
                    </div>
                }
            </main>
            {noteMode && (
                <div
                    className={`
                            fixed inset-0 z-0 pointer-events-none overflow-hidden
                            flex items-center justify-center
                            transition-opacity duration-1000 ease-out
                            ${noteMode ? 'opacity-100' : 'opacity-0'}
                        `}
                >
                    <div
                        className={`
                                relative transition-all duration-1200 ease-out
                                ${noteMode
                                ? 'scale-100 opacity-100 translate-y-0'
                                : 'scale-110 opacity-0 translate-y-12 blur-sm'
                            }
                        `}
                    >
                        <div className="animate-horizontal-scroll flex items-center gap-8 w-max px-8">
                            <h1 className="shrink-0 text-white text-10xl font-black">z20</h1>
                            <h2 className="shrink-0 text-white text-8xl italic font-light">-</h2>
                            <h2 className="shrink-0 text-white text-12xl font-bold">Turn</h2>
                            <h2 className="shrink-0 text-transparent text-12xl font-bold italic outline-text">Your</h2>
                            <h2 className="shrink-0 text-white text-9xl font-medium">Mind</h2>
                            <h2 className="shrink-0 text-white text-9xl font-extralight italic">To</h2>
                            <h2 className="shrink-0 text-white text-13xl font-bold">Real</h2>
                            <h2 className="shrink-0 text-transparent text-13xl font-bold outline-text italic">Life</h2>
                        </div>

                        <div className="absolute top-0 left-0 animate-horizontal-scroll-2 flex items-center gap-8 px-8 w-max">
                            <h1 className="shrink-0 text-white text-10xl font-black">z20</h1>
                            <h2 className="shrink-0 text-white text-8xl italic font-light">-</h2>
                            <h2 className="shrink-0 text-white text-12xl font-bold">Turn</h2>
                            <h2 className="shrink-0 text-transparent text-12xl font-bold italic outline-text">Your</h2>
                            <h2 className="shrink-0 text-white text-9xl font-medium">Mind</h2>
                            <h2 className="shrink-0 text-white text-9xl font-extralight italic">To</h2>
                            <h2 className="shrink-0 text-white text-13xl font-bold">Real</h2>
                            <h2 className="shrink-0 text-transparent text-13xl font-bold outline-text italic">Life.</h2>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};