import { LogIn } from "lucide-react"
import { Button } from "../ui/button"

interface LoginProps {
    onOpenLoginDialog: (open: boolean) => void;
}
const LoginButton = ({onOpenLoginDialog}: LoginProps) => {
    return (
        <div className="fixed inset-0 z-50 w-full flex justify-end p-4 pt-10">
            <Button onClick={() => onOpenLoginDialog(true)} className="hover:cursor-pointer text-white bg-purple-700 text-[20px] px-6 shadow-[-9px_4px_19px_8px_rgba(0,_0,_0,_0.2)]
      w-[200px] border border-white
      ">
                <LogIn />
                Join here
            </Button>
        </div>
    )

}
export default LoginButton