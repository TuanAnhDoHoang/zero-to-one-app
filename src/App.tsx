import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import { Experience } from "./components/experience";
import { noteModeAtom, UI } from "./components/ui";
import EditModal from "./components/Modal";
import { useAuth } from "./contexts/auth-context";
import { LoginDialog } from "./components/auth/login-dialog";
import LoginButton from "./components/auth/loginButton";
import LogoutButton from "./components/auth/logoutButton";
import Tabs from "./components/tabs";
import { useAtom } from "jotai";
import Shop from "./components/shop/shop";
import { Toaster } from "./components/ui/toaster";


//Not authenticate
interface BeforeLoginProps {
  openLogin: boolean,
  setOpenLogin: (open: boolean) => void
}
const BeforeLoginComponents = ({ setOpenLogin, openLogin }: BeforeLoginProps) => {
  return (
    <>
      <LoginButton onOpenLoginDialog={setOpenLogin} />
      {!openLogin && <h1 id="typewriter" className="text-[30px] text-slate-100 text-center h-[30vh] flex items-end justify-center">
        Login to use ...
      </h1>}
      <LoginDialog open={openLogin} onOpenChange={setOpenLogin} />
    </>
  )
}

//Authenticated
interface AfterLoginProps {
  setOpenLogin: (open: boolean) => void
}
const AfterLoginComponents = ({ setOpenLogin }: AfterLoginProps) => {
  const [noteMode] = useAtom(noteModeAtom);
  return (
    <>
      {
        noteMode ?
          <>
            <LogoutButton noteMode={noteMode} onOpenLoginDialog={setOpenLogin} />
            <Loader />
            {noteMode &&
              <Canvas shadows camera={{
                position: [-0.5, 1, window.innerWidth > 800 ? 4 : 9],
                fov: 45,
              }}>
                <group position-y={0}>
                  <Suspense fallback={null}>
                    <Experience />
                  </Suspense>
                </group>
              </Canvas>
            }
          </>
          :
          <Shop />
      }
    </>


  )
}

const App = () => {
  const [noteMode] = useAtom(noteModeAtom);
  return (
    <div className={`w-screen ${noteMode ? 'h-screen' : 'min-h-screen overflow-x-hide'} bg-[radial-gradient(circle_at_center,#5a47ce_0%,#232323_80%)]`}>
      <Home />
    </div>
  );
}

function Home() {
  const { isAuthenticated } = useAuth();
  const [openLogin, setOpenLogin] = useState(!isAuthenticated);
  const [_, setNoteMode] = useAtom(noteModeAtom);
  return (
    <>
      <UI />
      <Tabs onSwitchNoteMode={setNoteMode} />
      {isAuthenticated && !openLogin ?
        <AfterLoginComponents setOpenLogin={setOpenLogin} />
        :
        <BeforeLoginComponents openLogin={openLogin} setOpenLogin={setOpenLogin} />
      }
      <EditModal />
      <Toaster />
    </>
  );
}

export default App;