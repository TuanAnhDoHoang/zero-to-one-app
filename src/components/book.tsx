import { Html, useCursor, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useAtom } from "jotai";
import { easing } from "maath";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Bone,
    BoxGeometry,
    Color,
    Float32BufferAttribute,
    MathUtils,
    MeshStandardMaterial,
    Skeleton,
    SkinnedMesh,
    SRGBColorSpace,
    Uint16BufferAttribute,
    Vector3,
} from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { editModalAtom, pageAtom, pagesStructureAtom, zoomingEditPageAtom } from "./ui";
import { Group } from "three/examples/jsm/libs/tween.module.js";
import { Plus, X } from "lucide-react";
import { useProjects } from "@/contexts/project-context";

const easingFactor = 0.5; // Controls the speed of the easing
const easingFactorFold = 0.3; // Controls the speed of the easing
const insideCurveStrength = 0.18; // Controls the strength of the curve
const outsideCurveStrength = 0.05; // Controls the strength of the curve
const turningCurveStrength = 0.09; // Controls the strength of the curve

const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71; // 4:3 aspect ratio
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

const pageGeometry = new BoxGeometry(
    PAGE_WIDTH,
    PAGE_HEIGHT,
    PAGE_DEPTH,
    PAGE_SEGMENTS,
    2
);

pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes = [];
const skinWeights = [];

for (let i = 0; i < position.count; i++) {
    // ALL VERTICES
    vertex.fromBufferAttribute(position, i); // get the vertex
    const x = vertex.x; // get the x position of the vertex

    const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH)); // calculate the skin index
    let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH; // calculate the skin weight

    skinIndexes.push(skinIndex, skinIndex + 1, 0, 0); // set the skin indexes
    skinWeights.push(1 - skinWeight, skinWeight, 0, 0); // set the skin weights
}

pageGeometry.setAttribute(
    "skinIndex",
    new Uint16BufferAttribute(skinIndexes, 4)
);
pageGeometry.setAttribute(
    "skinWeight",
    new Float32BufferAttribute(skinWeights, 4)
);

const whiteColor = new Color("white");
const emissiveColor = new Color("orange");

const pageMaterials = [
    new MeshStandardMaterial({
        color: whiteColor,
    }),
    new MeshStandardMaterial({
        color: "#111",
    }),
    new MeshStandardMaterial({
        color: whiteColor,
    }),
    new MeshStandardMaterial({
        color: whiteColor,
    }),
];
// ====================== PAGE COMPONENT ======================
interface PageProps {
    number: number;
    front: string;
    back: string;
    page: number;
    opened: boolean;
    bookClosed: boolean;
    [key: string]: any; // cho ...props
}


const Page: React.FC<PageProps> = ({ number, front, back, page, opened, bookClosed, ...props }) => {
    const [pages] = useAtom(pagesStructureAtom);
    const [picture, picture2, pictureRoughness] = useTexture([
        `/textures/${front}.jpg`,
        `/textures/${back}.jpg`,
        ...(number === 0 || number === (pages??[]).length - 1
            ? [`/textures/book-cover-roughness.jpg`]
            : []),
    ]);
    picture.colorSpace = picture2.colorSpace = SRGBColorSpace;
    const group = useRef<Group>(null);
    const turnedAt = useRef<number>(0);
    const lastOpened = useRef<boolean>(opened);

    const skinnedMeshRef = useRef<SkinnedMesh>(null);

    const manualSkinnedMesh = useMemo(() => {
        const bones = [];
        for (let i = 0; i <= PAGE_SEGMENTS; i++) {
            let bone = new Bone();
            bones.push(bone);
            if (i === 0) {
                bone.position.x = 0;
            } else {
                bone.position.x = SEGMENT_WIDTH;
            }
            if (i > 0) {
                bones[i - 1].add(bone); // attach the new bone to the previous bone
            }
        }
        const skeleton = new Skeleton(bones);

        const materials = [
            ...pageMaterials,
            new MeshStandardMaterial({
                color: whiteColor,
                map: picture,
                ...(number === 0
                    ? {
                        roughnessMap: pictureRoughness,
                    }
                    : {
                        roughness: 0.1,
                    }),
                emissive: emissiveColor,
                emissiveIntensity: 0,
            }),
            new MeshStandardMaterial({
                color: whiteColor,
                map: picture2,
                ...(number === (pages??[]).length - 1
                    ? {
                        roughnessMap: pictureRoughness,
                    }
                    : {
                        roughness: 0.1,
                    }),
                emissive: emissiveColor,
                emissiveIntensity: 0,
            }),
        ];
        const mesh = new SkinnedMesh(pageGeometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        mesh.add(skeleton.bones[0]);
        mesh.bind(skeleton);
        return mesh;
    }, []);

    // useHelper(skinnedMeshRef, SkeletonHelper, "red");
    const [zoomingEditPage, setZoomingEditPage] = useAtom(zoomingEditPageAtom);
    const [{ isOpen }, setEditModal] = useAtom(editModalAtom);
    const { projects, deleteProject } = useProjects();

    useFrame((_, delta) => {
        if (!skinnedMeshRef.current) {
            return;
        }

        // Highlight emissive
        const targetEmissive = highlighted ? 0.22 : 0;
        const mats = skinnedMeshRef.current.material as MeshStandardMaterial[];
        mats[4].emissiveIntensity = mats[5].emissiveIntensity = MathUtils.lerp(
            mats[4].emissiveIntensity,
            targetEmissive,
            0.1
        );
        // const emissiveIntensity = highlighted ? 0.22 : 0;
        // skinnedMeshRef.current.material[4].emissiveIntensity =
        //   skinnedMeshRef.current.material[5].emissiveIntensity = MathUtils.lerp(
        //     skinnedMeshRef.current.material[4].emissiveIntensity,
        //     emissiveIntensity,
        //     0.1
        //   );

        if (lastOpened.current !== opened) {
            turnedAt.current = performance.now();
            lastOpened.current = opened;
        }
        let turningTime = Math.min(400, performance.now() - turnedAt.current) / 400;
        turningTime = Math.sin(turningTime * Math.PI);

        let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
        if (!bookClosed) {
            targetRotation += degToRad(number * 0.8);
        }

        const bones = skinnedMeshRef.current.skeleton.bones;
        for (let i = 0; i < bones.length; i++) {
            const target = i === 0 ? group.current : bones[i];
            if (!target) continue;
            const bone = target as Bone;
            const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
            const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
            const turningIntensity =
                Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;
            let rotationAngle =
                insideCurveStrength * insideCurveIntensity * targetRotation -
                outsideCurveStrength * outsideCurveIntensity * targetRotation +
                turningCurveStrength * turningIntensity * targetRotation;
            let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);
            if (bookClosed) {
                if (i === 0) {
                    rotationAngle = targetRotation;
                    foldRotationAngle = 0;
                } else {
                    rotationAngle = 0;
                    foldRotationAngle = 0;
                }
            }
            easing.dampAngle(
                bone.rotation,
                "y",
                rotationAngle,
                easingFactor,
                delta
            );

            const foldIntensity =
                i > 8
                    ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime
                    : 0;
            easing.dampAngle(
                bone.rotation,
                "x",
                foldRotationAngle * foldIntensity,
                easingFactorFold,
                delta
            );
        }

        if (!group.current) return;

        const isZooming = zoomingEditPage === number;
        const targetScale = isZooming ? 6 : 1; // Phóng to x6 (tùy chỉnh)
        const targetX = isZooming ? 0 : 0;      // Di chuyển ra giữa
        const targetY = isZooming ? 0 : 0;
        const targetZ = isZooming ? 3 : -number * PAGE_DEPTH + page * PAGE_DEPTH;
        const g = group.current as any;
        easing.damp(g.scale, "x", targetScale, 0.15, delta);
        easing.damp(g.scale, "y", targetScale, 0.15, delta);
        easing.damp(g.scale, "z", targetScale, 0.15, delta);

        easing.damp(g.position, "x", targetX, 0.15, delta);
        easing.damp(g.position, "y", targetY, 0.15, delta);
        easing.damp(g.position, "z", targetZ, 0.25, delta);

        // Khi zoom gần xong → tự động chuyển trang
        if (isZooming && g.scale.x > 4.5) {
            // setZoomingEditPage(-1); // Reset
            // Hoặc React Router: navigate(`/edit/${number}`);
        }
    });

    const [_, setPage] = useAtom(pageAtom);
    const [highlighted, setHighlighted] = useState(false);
    useCursor(highlighted);

    const handleClickEdit = (n: number) => {
        zoomingEditPage === -1 && setZoomingEditPage(n);
        setTimeout(() => {
            setEditModal({ isOpen: true, pageNumber: n });
        }, 500);
    }
    const handleNewNote = (n: number) => {
        setPage(0);
        setEditModal({ isOpen: true, pageNumber: n });
    }

    const hanldeDeleteNote = async (n: number) => {
        if (n >= 0 && n < projects.length) {
            console.log('detele project: ', n);
            await deleteProject(projects[n].id);
            setPage(n - 1);
        }
    }
    useEffect(() => { !isOpen && setZoomingEditPage(-1) }, [isOpen])

    return (
        <group
            {...props}
            ref={group}
            onPointerEnter={(e) => {
                e.stopPropagation();
                setHighlighted(true);
            }}
            onPointerLeave={(e) => {
                e.stopPropagation();
                setHighlighted(false);
            }}
            onClick={(e) => {
                e.stopPropagation();
                setPage(opened ? number : number + 1);
                setHighlighted(false);
            }}
        >
            <primitive
                object={manualSkinnedMesh}
                ref={skinnedMeshRef}
                position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH}
            />
            {opened && (page === number || page === number + 1) && zoomingEditPage === -1 && (
                <Html
                    position={[PAGE_WIDTH / 2 - 0.45, PAGE_HEIGHT - 0.5, 0.02]}
                    center
                >
                    <div className="flex gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // setEditPage(number); // Khi nào có edit mode thì bật dòng này
                                handleClickEdit(page);
                            }}
                            className="bg-black/20 hover:bg-black/90 text-white px-2 py-2 rounded-xl shadow-2xl transition-all flex items-center gap-2 text-lg font-medium
                        hover:cursor-pointer
                        "
                        >
                            ✏️
                        </button>
                        <button onClick={(e) => {
                            // e.stopPropagation();
                            hanldeDeleteNote(page)
                        }} className="bg-black/20 hover:bg-black/90 text-white px-2 py-2 rounded-xl shadow-2xl transition-all flex items-center gap-2 text-lg font-medium
                        hover:cursor-pointer">
                            <X />
                        </button>
                    </div>
                </Html>
            )}
            {!opened && page === 0 && !isOpen && (
                <Html position={[PAGE_WIDTH / 2, PAGE_HEIGHT / 2, 0.02]}
                    center>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNewNote(0);
                        }}
                        className="bg-black/20 hover:bg-black/90 text-white px-2 py-2 rounded-xl shadow-2xl transition-all flex items-center gap-2 text-lg font-medium
                        hover:cursor-pointer
                        "
                    >
                        <Plus />
                    </button>
                </Html>
            )}
        </group>
    );
};

export const Book = ({ ...props }) => {
    const [page] = useAtom(pageAtom);
    const [delayedPage, setDelayedPage] = useState(page);
    const [pagesStruct] = useAtom(pagesStructureAtom);
    if (pagesStruct) {
        pagesStruct.forEach((page) => {
            useTexture.preload(`/textures/${page.front}.jpg`);
            useTexture.preload(`/textures/${page.back}.jpg`);
            useTexture.preload(`/textures/book-cover-roughness.jpg`);
        });
    }
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const goToPage = () => {
            setDelayedPage((delayedPage) => {
                if (page === delayedPage) {
                    return delayedPage;  // ✅ Trả về number
                } else {
                    timeout = setTimeout(
                        () => {
                            goToPage();
                        },
                        Math.abs(page - delayedPage) > 2 ? 50 : 150
                    );
                    if (page > delayedPage) {
                        return delayedPage + 1;  // ✅ Trả về number
                    } else if (page < delayedPage) {
                        return delayedPage - 1;  // ✅ Trả về number
                    }
                    return delayedPage;  // ✅ Thêm default return
                }
            });
        };
        goToPage();
        return () => {
            clearTimeout(timeout);
        };
    }, [page]);

    return (
        <group {...props} rotation-y={-Math.PI / 2}>
            {[...pagesStruct??[]].map((pageData, index) => (
                <Page
                    key={index}
                    page={delayedPage}
                    number={index}
                    opened={delayedPage > index}
                    bookClosed={delayedPage === 0 || delayedPage === (pagesStruct??[]).length}
                    {...pageData}
                />
            ))}
        </group>
    );
};