import { Hand, ChevronDown, Copy, CopyCheck, X } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "@/contexts/auth-context";
import { ConnectButton, useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { useState, useRef } from "react";

interface LogoutProps {
    noteMode: boolean;
    onOpenLoginDialog: (open: boolean) => void;
}

const LogoutButton = ({ noteMode, onOpenLoginDialog }: LogoutProps) => {
    const { logout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const currAccount = useCurrentAccount();
    const { mutate: disconnectWallet } = useDisconnectWallet();

    const handleLogout = () => {
        logout();
        onOpenLoginDialog(true);
        setIsDropdownOpen(false);
    };
    const handleCopyAddress = () => {
        if (currAccount) {
            navigator.clipboard.writeText(currAccount.address);
            setCopied(true);
            setTimeout(() => {
                setCopied(false)
            }, 2000);
        }
    }

    return (
        <div
            className={`
                fixed inset-0 z-10 pointer-events-none 
                w-full h-[150px] flex items-scenter justify-end p-4 pt-10
                transition-all duration-700 ease-out
            `}
        >
            <div
                ref={dropdownRef}
                className={`
                    relative transition-all duration-700 ease-out
                    ${noteMode
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
                    }
                `}
            >
                <Button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="
                        hover:cursor-pointer text-white bg-purple-700 
                        text-[20px] px-8 py-6 shadow-[-9px_4px_19px_8px_rgba(0,0,0,0.3)]
                        w-[150px] border border-white/50 rounded-xl
                        hover:bg-purple-800 hover:shadow-[-12px_6px_24px_10px_rgba(0,0,0,0.3)]
                        transition-all duration-300 flex items-center justify-center
                    "
                >
                    Account
                    <ChevronDown className={`ml-2 h-5 w-5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                    <div className="mt-2 bottom-full mb-2 w-full border border-white/50 rounded-xl shadow-[-9px_4px_19px_8px_rgba(0,0,0,0.3)] overflow-hidden">
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-6 py-4 text-white hover:bg-purple-800 transition-all duration-200 flex items-center text-[16px]"
                        >
                            <Hand className="mr-3 h-5 w-5" />
                            Logout
                        </button>
                        <div className="px-6 py-4 hover:bg-purple-800 hover:cursor-pointer">
                            {currAccount ?
                                <div className="text-white flex gap-2" onClick={handleCopyAddress} >
                                    {copied ? <CopyCheck /> : <Copy />}
                                    <p className="">
                                        {currAccount.address.substring(0, 6)}...{currAccount.address.substring(62)}
                                    </p>
                                </div>
                                :
                                <ConnectButton style={{
                                    width: "100%",
                                    backgroundColor: "transparent",
                                    color: "white",
                                    border: "none",
                                    padding: "0",
                                    fontSize: "16px"
                                }} />
                            }
                        </div>
                        {currAccount &&
                            <button
                                onClick={() => disconnectWallet()}
                                className="w-full text-left px-6 py-4 text-white hover:bg-purple-800 transition-all duration-200 flex items-center text-[16px]"
                            >
                                <X className="mr-3 h-5 w-5" />
                                Disconnect wallet
                            </button>
                        }
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogoutButton;