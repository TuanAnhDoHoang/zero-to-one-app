import { Environment, Float, OrbitControls } from "@react-three/drei";
import { Book } from "./book";
import { useAtom } from "jotai";
import { zoomingEditPageAtom } from "./ui";

export const Experience = () => {
  const [zoomingEditPage] = useAtom(zoomingEditPageAtom);
  return (
    <>
      <Float
        scale={zoomingEditPage === -1 ? 1 : 0.5}
        rotation-x={-Math.PI / 16}
        floatIntensity={1}
        speed={2}
        rotationIntensity={2}
      >
        <Book />
      </Float>

      {/* </Bounds> */}
      <OrbitControls />
      <Environment preset="studio"></Environment>
      <directionalLight
        position={[2, 5, 2]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      <mesh position-y={-1.5} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>
    </>
  );
};