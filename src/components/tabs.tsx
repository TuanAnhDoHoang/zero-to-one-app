import { Earth, Notebook } from "lucide-react"
import { Button } from "./ui/button"
import { useAtom } from "jotai";
import { noteModeAtom } from "./ui";

interface tabsProps {
    onSwitchNoteMode: (mode: boolean) => void;
}
const Tabs = ({ onSwitchNoteMode }: tabsProps) => {
    const [noteMode] = useAtom(noteModeAtom);
    return (
        <div className={`${noteMode ? 'h-[160px]  w-[450px]' : 'h-[50px] w-[50%]'}  mx-auto fixed inset-0 z-50 flex gap-4 justify-between items-end transition-all duration-500 ease-out`}>
            <Button className={`hover:cursor-pointer text-white ${noteMode ? 'bg-purple-700' : 'bg-gray-500'} hover:bg-purple-700 text-[20px] px-6 shadow-[-9px_4px_19px_8px_rgba(0,_0,_0,_0.2)]
      w-[200px] border border-white`}
                onClick={() => onSwitchNoteMode(true)}
            >
                <Notebook />
                Note Book
            </Button>
            <Button className={`hover:cursor-pointer text-white ${!noteMode ? 'bg-purple-700' : 'bg-gray-500'} hover:bg-purple-700 text-[20px] px-6 shadow-[-9px_4px_19px_8px_rgba(0,_0,_0,_0.2)]
      w-[200px] border border-white`}
                onClick={() => onSwitchNoteMode(false)}
            >
                <Earth />
                Explore
            </Button>
        </div>
    )

}
export default Tabs